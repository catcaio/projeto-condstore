import { getDb } from '../db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { messages, type NewMessageRecord } from '../../drizzle/schema';
import { logger } from '../logger';
import { ErrorCode, InfrastructureError } from '../errors';

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

            // Check if message already exists (idempotency)
            const existing = await db
                .select({ messageSid: messages.messageSid })
                .from(messages)
                .where(eq(messages.messageSid, record.messageSid))
                .limit(1);

            if (existing.length > 0) {
                logger.debug('Message already persisted, skipping', {
                    messageSid: record.messageSid,
                    tenantId: record.tenantId,
                });
                return;
            }

            await db.insert(messages).values(record);

            logger.info('Inbound message persisted', {
                messageSid: record.messageSid,
                fromPhone: record.fromPhone,
                tenantId: record.tenantId,
            });
        } catch (error) {
            // Log but do NOT throw — message persistence must not break the bot flow
            logger.error('Failed to persist inbound message', error as Error, {
                messageSid: record.messageSid,
                fromPhone: record.fromPhone,
                tenantId: record.tenantId,
            });
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
