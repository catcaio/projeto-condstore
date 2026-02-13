import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, sql } from 'drizzle-orm';
import { messages, type NewMessageRecord } from '../../drizzle/schema';
import { logger } from '../logger';
import { ErrorCode, InfrastructureError } from '../errors';

// Reuse the same DB singleton pattern as simulation.repository.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any = null;

async function getDb() {
    if (dbInstance) return dbInstance;

    if (!process.env.DATABASE_URL) {
        throw new InfrastructureError(
            ErrorCode.INTERNAL_ERROR,
            'DATABASE_URL is not defined'
        );
    }

    const connectionPool = mysql.createPool(process.env.DATABASE_URL);
    dbInstance = drizzle(connectionPool, { mode: 'default' });

    try {
        const conn = await connectionPool.getConnection();
        logger.info('MessageRepository: DB connected successfully');
        conn.release();
    } catch (err) {
        logger.error('MessageRepository: DB connection failed', err as Error);
        throw new InfrastructureError(
            ErrorCode.INTERNAL_ERROR,
            'Database connection verification failed',
            { error: (err as Error).message }
        );
    }

    return dbInstance;
}

export class MessageRepository {
    /**
     * Save an inbound message with idempotency on messageSid.
     * If the messageSid already exists, the insert is silently skipped (no error).
     */
    async saveInboundMessage(record: NewMessageRecord): Promise<void> {
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
                });
                return;
            }

            await db.insert(messages).values(record);

            logger.info('Inbound message persisted', {
                messageSid: record.messageSid,
                fromPhone: record.fromPhone,
            });
        } catch (error) {
            // Log but do NOT throw — message persistence must not break the bot flow
            logger.error('Failed to persist inbound message', error as Error, {
                messageSid: record.messageSid,
                fromPhone: record.fromPhone,
            });
        }
    }
    async getMetricsToday() {
        const db = await getDb();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(messages)
            .where(sql`${messages.createdAt} >= ${today}`);

        const intentsResult = await db
            .select({
                intent: messages.intent,
                count: sql<number>`count(*)`,
            })
            .from(messages)
            .where(sql`${messages.createdAt} >= ${today}`)
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

    async getMetricsTotal() {
        const db = await getDb();

        const [totalResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(messages);

        const intentsResult = await db
            .select({
                intent: messages.intent,
                count: sql<number>`count(*)`,
            })
            .from(messages)
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
