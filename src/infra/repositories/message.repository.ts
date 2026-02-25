import { getDb } from '../db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { messages, type NewMessageRecord } from '../../drizzle/schema';
import { logger } from '../logger';
import { ErrorCode, InfrastructureError } from '../errors';
import { redisClient } from '../redis.client';

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

export class MessageRepository {
    /**
     * Save an inbound message with idempotency on messageSid.
     * If the messageSid already exists, the insert is silently skipped (no error).
     * REQUIRES tenant_id - will not work without it.
     */
    async saveInboundMessage(record: NewMessageRecord): Promise<void> {
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

            // Idempotency via unique constraint (messageSid is PK)
            await db.insert(messages).values(record);

            if (redisClient.isAvailable()) {
                await redisClient.del(`cockpit:metrics:${record.tenantId}`);
            }

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
                .limit(1);
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
     * Single query, filtered by (tenantId, fromPhone), ordered DESC then reversed
     * so the caller always receives history in conversation order.
     *
     * Returns an empty array (never throws) so callers can safely ignore failures
     * in the hot path.
     */
    async getLastMessages(tenantId: string, phoneNumber: string, limit: number): Promise<ContextMessage[]> {
        if (!tenantId || !phoneNumber || limit <= 0) return [];

        try {
            const db = await getDb();
            const rows = await db
                .select({
                    body: messages.body,
                    direction: messages.direction,
                    intent: messages.intent,
                    intentConfidence: messages.intentConfidence,
                    createdAt: messages.createdAt,
                })
                .from(messages)
                .where(and(eq(messages.tenantId, tenantId), eq(messages.fromPhone, phoneNumber)))
                .orderBy(desc(messages.createdAt))
                .limit(limit);

            // Reverse so the result is oldest-first (natural conversation order)
            return rows.reverse().map(r => ({
                body: r.body,
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
