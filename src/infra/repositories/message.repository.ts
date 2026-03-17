import { getDb } from '../db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { messages, type NewMessageRecord } from '../../drizzle/schema';
import { logger } from '../logger';
import { ErrorCode, InfrastructureError } from '../errors';
import { redisClient } from '../redis.client';
import { encryptString, decryptString, isEncryptedString } from '../pii/crypto';
import { hashPhoneForTenant } from '../pii/phone';
import { planEnforcementService } from '@/modules/finops';

/**
 * Compact message snapshot used by the context cache and Frank orchestrator.
 * Intentionally small — only fields relevant for conversation context.
 */
export interface ContextMessage {
    body: string;
    direction: 'inbound' | 'outbound';
    intent: string;
    /** Classifier confidence in [0, 1].  null when no classifier ran. */
    intentConfidence: number | null;
    createdAt: string; // ISO-8601 string (serialisation-safe)
}

const REDACTED_PHONE_PLACEHOLDER = '[redacted]';

function makeEncryptedBodyPlaceholder(body: string): string {
    return `[encrypted:${body.length}]`;
}

function resolveStoredBody(row: { body: string; bodyEncrypted?: string | null }, tenantId: string): string {
    const encrypted = row.bodyEncrypted;
    if (encrypted && isEncryptedString(encrypted)) {
        try {
            return decryptString(encrypted);
        } catch (error) {
            logger.warn('Failed to decrypt message body in getLastMessages', { tenantId, error: (error as Error).name });
        }
    }

    return row.body;
}

async function queryLastMessagesByPhoneHash(
    tenantId: string,
    hashedPhone: string,
    limit: number,
) {
    const db = await getDb();
    return db
        .select({
            body: messages.body,
            bodyEncrypted: messages.bodyEncrypted,
            direction: messages.direction,
            intent: messages.intent,
            intentConfidence: messages.intentConfidence,
            createdAt: messages.createdAt,
        })
        .from(messages)
        .where(and(eq(messages.tenantId, tenantId), eq(messages.phoneHash, hashedPhone)))
        .orderBy(desc(messages.createdAt))
        .limit(limit);
}

export class MessageRepository {
    /**
     * Save an inbound message with idempotency on messageSid.
     * If the messageSid already exists, the insert is silently skipped (no error).
     * REQUIRES tenant_id - will not work without it.
     */
    async saveInboundMessage(record: Omit<NewMessageRecord, 'fromPhoneHash' | 'phoneHash' | 'phoneEncrypted' | 'toPhone'> & { fromPhone: string, toPhone?: string | null }): Promise<void> {
        // Enforce tenant_id requirement
        if (!record.tenantId) {
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'tenant_id is required to save message',
                { messageSid: record.messageSid }
            );
        }

        try {
            const db = await getDb();
            const { e164, hash } = hashPhoneForTenant(record.fromPhone, record.tenantId);
            const phoneEncrypted = encryptString(e164);
            const bodyEncrypted = encryptString(record.body);
            const recordToPersist: NewMessageRecord = {
                messageSid: record.messageSid,
                tenantId: record.tenantId,
                fromPhoneHash: hash,
                phoneHash: hash,
                phoneEncrypted,
                toPhone: record.toPhone ?? null,
                body: makeEncryptedBodyPlaceholder(record.body),
                bodyEncrypted,
                direction: record.direction ?? 'inbound',
                intent: record.intent,
                intentConfidence: record.intentConfidence,
                rawPayload: record.rawPayload,
            };

            // Idempotency via unique constraint (messageSid is PK)
            await db.insert(messages).values(recordToPersist);

            if (redisClient.isAvailable()) {
                await redisClient.del(`cockpit:metrics:${record.tenantId}`);
            }

            // Invalidate FinOps plan enforcement cache
            await planEnforcementService.invalidateCache(record.tenantId);

            logger.info('Inbound message persisted', {
                messageSid: record.messageSid,
                // fromPhone removed for PII
                tenantId: record.tenantId,
            });
        } catch (error: any) {
            // Handle duplicate entry (idempotency)
            if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
                logger.debug('Message already persisted, skipping', {
                    messageSid: record.messageSid,
                    tenantId: record.tenantId,
                });
                return;
            }

            // Log but do NOT throw — message persistence must not break the bot flow
            logger.error('Failed to persist inbound message', error as Error, {
                messageSid: record.messageSid,
                // fromPhone removed for PII
                tenantId: record.tenantId,
            });
        }
    }
    /**
     * Check if a message with this SID has already been persisted.
     * Used for idempotency — prevents re-processing Twilio retries.
     */
    async existsByMessageSid(messageSid: string): Promise<boolean> {
        if (!messageSid) return false;
        try {
            const db = await getDb();
            const [row] = await db
                .select({ messageSid: messages.messageSid })
                .from(messages)
                .where(eq(messages.messageSid, messageSid))
                ;
            return !!row;
        } catch (error) {
            // On error, return false so the request is NOT blocked (fail-open for idempotency)
            logger.error('existsByMessageSid query failed', error as Error, { messageSid });
            return false;
        }
    }

    async getMetricsToday(tenantId: string) {
        if (!tenantId) {
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'tenant_id is required to get metrics'
            );
        }

        const db = await getDb();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(messages)
            .where(sql`${messages.createdAt} >= ${today} AND ${messages.tenantId} = ${tenantId}`);

        const intentsResult = await db
            .select({
                intent: messages.intent,
                count: sql<number>`count(*)`,
            })
            .from(messages)
            .where(sql`${messages.createdAt} >= ${today} AND ${messages.tenantId} = ${tenantId}`)
            .groupBy(messages.intent);

        const intentsBreakdown: Record<string, number> = {};
        intentsResult.forEach((row: { intent: string | null; count: number }) => {
            const key = row.intent || 'unknown';
            intentsBreakdown[key] = Number(row.count);
        });

        return {
            total: Number(totalResult?.count || 0),
            breakdown: intentsBreakdown,
        };
    }

    /**
     * Return the last `limit` messages sent by `phoneNumber` within `tenantId`,
     * in chronological order (oldest → newest).
     *
     * Preferred query path filters by `(tenantId, phone_hash)` (tenant-scoped hash),
     * with temporary fallback to legacy `(tenantId, fromPhone)` while old rows are
     * still being backfilled.
     *
     * Message text is read from `body_encrypted` when available (cutover path),
     * with fallback to legacy `body` for pre-backfill rows.
     *
     * Returns an empty array (never throws) so callers can safely ignore failures
     * in the hot path.
     */
    async getLastMessages(tenantId: string, phoneNumber: string, limit: number): Promise<ContextMessage[]> {
        if (!tenantId || !phoneNumber || limit <= 0) return [];

        try {
            let rows: Array<{
                body: string;
                bodyEncrypted: string | null;
                direction: string;
                intent: string;
                intentConfidence: unknown;
                createdAt: unknown;
            }> = [];
            try {
                const hashedPhone = hashPhoneForTenant(phoneNumber, tenantId).hash;
                rows = await queryLastMessagesByPhoneHash(tenantId, hashedPhone, limit);
            } catch (hashError) {
                logger.warn('getLastMessages phone hash generation failed', {
                    tenantId,
                    error: (hashError as Error).name,
                });
            }

            // Reverse so the result is oldest-first (natural conversation order)
            return rows.reverse().map(r => ({
                body: resolveStoredBody(r, tenantId),
                direction: r.direction as 'inbound' | 'outbound',
                intent: r.intent,
                intentConfidence: r.intentConfidence !== null && r.intentConfidence !== undefined
                    ? Number(r.intentConfidence)
                    : null,
                createdAt: r.createdAt instanceof Date
                    ? r.createdAt.toISOString()
                    : new Date(String(r.createdAt)).toISOString(),
            }));
        } catch (err) {
            logger.error('getLastMessages query failed', err as Error, { tenantId });
            return [];
        }
    }

    async getMetricsTotal(tenantId: string) {
        if (!tenantId) {
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'tenant_id is required to get metrics'
            );
        }

        const db = await getDb();

        const [totalResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(messages)
            .where(eq(messages.tenantId, tenantId));

        const intentsResult = await db
            .select({
                intent: messages.intent,
                count: sql<number>`count(*)`,
            })
            .from(messages)
            .where(eq(messages.tenantId, tenantId))
            .groupBy(messages.intent);

        const intentsBreakdown: Record<string, number> = {};
        intentsResult.forEach((row: { intent: string | null; count: number }) => {
            const key = row.intent || 'unknown';
            intentsBreakdown[key] = Number(row.count);
        });

        return {
            total: Number(totalResult?.count || 0),
            breakdown: intentsBreakdown,
        };
    }
}

export const messageRepository = new MessageRepository();
