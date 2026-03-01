import { getDb } from '../db';
import { domineEvents, domineOrders, domineFreightQuotes } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

export class DomineEventsRepository {
    async publish(data: {
        tenantId: string;
        source: 'cockpit' | 'webhook' | 'connector' | 'frank';
        type: string;
        idempotencyKey: string;
        payloadJson?: any;
    }): Promise<{ id: string; inserted: boolean }> {
        const db = await getDb();
        const id = crypto.randomUUID();

        try {
            await db.insert(domineEvents).values({
                id,
                tenantId: data.tenantId,
                source: data.source,
                type: data.type,
                idempotencyKey: data.idempotencyKey,
                payloadJson: data.payloadJson ?? null,
                status: 'queued',
            });
            return { id, inserted: true };
        } catch (e: any) {
            // ER_DUP_ENTRY (1062) means exact collision hit the DB-level unique constraint
            if (e.code === 'ER_DUP_ENTRY' || e.errno === 1062) {
                // Return explicitly that it was not inserted, simulating a lock protection.

                // Note: we can't reliably return the exact existing ID without another query, 
                // but for callers 'inserted: false' usually means fire-and-forget skips it.
                // We'll run a quick select just to return the original ID if callers need it to await processing
                const existing = await db.select({ id: domineEvents.id }).from(domineEvents)
                    .where(and(
                        eq(domineEvents.tenantId, data.tenantId),
                        eq(domineEvents.idempotencyKey, data.idempotencyKey)
                    )).limit(1);

                return { id: existing[0]?.id || id, inserted: false };
            }
            throw e;
        }
    }

    async getById(id: string) {
        const db = await getDb();
        const rows = await db.select().from(domineEvents).where(eq(domineEvents.id, id)).limit(1);
        return rows[0];
    }

    async markProcessed(id: string) {
        const db = await getDb();
        await db.update(domineEvents)
            .set({ status: 'processed', processedAt: new Date() })
            .where(eq(domineEvents.id, id));
    }

    async sendToDLQ(id: string, errorCode: string, errorMessage?: string, nextRetryAt?: Date) {
        const db = await getDb();
        await db.update(domineEvents)
            .set({
                status: 'failed',
                errorCode,
                errorMessage: errorMessage ?? null,
                processedAt: new Date(),
                nextRetryAt: nextRetryAt ?? null
            })
            .where(eq(domineEvents.id, id));
    }

    async lockAndGetNextEvent(tenantId: string): Promise<{ id: string } | null> {
        const db = await getDb();
        const { sql, and, or, eq, isNull, lte } = await import('drizzle-orm');

        // Note: For MySQL, standard UPDATE ... LIMIT 1 is atomic and acts as a queue pop.
        // We find one queued OR a stuck processing event, mark it processing and return its ID. 
        // We use a specific variable assignment trick or two queries simulating a lock.
        // Since drizzle does not support returning on mysql UPDATE, we'll use a transaction with FOR UPDATE.

        return await db.transaction(async (tx) => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            const next = await tx.select({ id: domineEvents.id })
                .from(domineEvents)
                .where(and(
                    eq(domineEvents.tenantId, tenantId),
                    or(
                        // Path A: It's queued and ready OR ready for retry
                        and(
                            eq(domineEvents.status, 'queued'),
                            or(
                                isNull(domineEvents.nextRetryAt),
                                lte(domineEvents.nextRetryAt, new Date())
                            )
                        ),
                        // Path B: It's processing but the lock expired (e.g. process crashed)
                        and(
                            eq(domineEvents.status, 'processing'),
                            lte(domineEvents.updatedAt, fiveMinutesAgo)
                        )
                    )
                ))
                .orderBy(domineEvents.createdAt)
                .limit(1)
                // Lock the row exclusively so other transactions wait or skip
                .for('update', { skipLocked: true });

            if (next.length === 0) return null;

            const targetId = next[0].id;

            // Set it to processing again and explicitly bump timestamp
            await tx.update(domineEvents)
                .set({ status: 'processing', updatedAt: new Date() })
                .where(eq(domineEvents.id, targetId));

            return { id: targetId };
        });
    }

    async listEvents(tenantId: string, filters: { type?: string, status?: string, limit?: number, offset?: number }) {
        const db = await getDb();
        const conditions = [eq(domineEvents.tenantId, tenantId)];
        if (filters.type) conditions.push(eq(domineEvents.type, filters.type));
        if (filters.status) conditions.push(eq(domineEvents.status, filters.status));

        return db.select()
            .from(domineEvents)
            .where(and(...conditions))
            .orderBy(desc(domineEvents.createdAt))
            .limit(filters.limit || 50)
            .offset(filters.offset || 0);
    }

    async getDLQCount(tenantId: string): Promise<number> {
        const db = await getDb();
        const rows = await db.select({ count: domineEvents.id }).from(domineEvents)
            .where(and(eq(domineEvents.tenantId, tenantId), eq(domineEvents.status, 'failed')));
        return rows.length;
    }

    async getDomineOperationalStats(tenantId?: string) {
        const db = await getDb();
        const { sql } = await import('drizzle-orm');

        // Build base where clause depending on tenantId
        const baseWhere = tenantId ? eq(domineEvents.tenantId, tenantId) : undefined;

        // Run aggregated queries
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // 1. Queue Status Counts
        const statusQuery = db.select({
            status: domineEvents.status,
            count: sql<number>`count(${domineEvents.id})`
        }).from(domineEvents);

        if (baseWhere) statusQuery.where(baseWhere);
        statusQuery.groupBy(domineEvents.status);

        const statusRows = await statusQuery;

        let totalQueued = 0;
        let totalProcessing = 0;
        let totalInDLQ = 0;

        for (const row of statusRows) {
            if (row.status === 'queued') totalQueued = Number(row.count);
            if (row.status === 'processing') totalProcessing = Number(row.count);
            if (row.status === 'failed') totalInDLQ = Number(row.count);
        }

        // 2. Processed/Failed Last Hour
        const hrQuery = db.select({
            status: domineEvents.status,
            count: sql<number>`count(${domineEvents.id})`
        }).from(domineEvents);

        const hrWheres = [
            sql`${domineEvents.processedAt} >= ${oneHourAgo}`
        ];
        if (tenantId) hrWheres.push(eq(domineEvents.tenantId, tenantId));

        hrQuery.where(and(...hrWheres)).groupBy(domineEvents.status);

        const hrRows = await hrQuery;
        let totalProcessedLastHour = 0;
        let totalFailedLastHour = 0;

        for (const row of hrRows) {
            if (row.status === 'processed') totalProcessedLastHour = Number(row.count);
            if (row.status === 'failed') totalFailedLastHour = Number(row.count);
        }

        // 3. Oldest Unprocessed Event Age
        const oldestQuery = db.select({
            oldestCreatedAt: domineEvents.createdAt
        }).from(domineEvents);

        const oldestWheres = [eq(domineEvents.status, 'queued')];
        if (tenantId) oldestWheres.push(eq(domineEvents.tenantId, tenantId));

        oldestQuery.where(and(...oldestWheres)).orderBy(domineEvents.createdAt).limit(1);

        const oldestRow = await oldestQuery;
        let oldestUnprocessedEventAge = 0;

        if (oldestRow.length > 0) {
            oldestUnprocessedEventAge = Date.now() - oldestRow[0].oldestCreatedAt.getTime();
        }

        return {
            totalQueued,
            totalProcessing,
            totalProcessedLastHour,
            totalFailedLastHour,
            totalInDLQ,
            oldestUnprocessedEventAge
        };
    }
}

export const domineEventsRepository = new DomineEventsRepository();
