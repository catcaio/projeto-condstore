import { getDb } from '../db';
import { domineEvents, domineOrders, domineFreightQuotes } from '../../drizzle/schema';
import { eq, and, desc, inArray, or, lte, isNull, sql } from 'drizzle-orm';
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

        // Check idempotency
        const existing = await db.select().from(domineEvents)
            .where(and(
                eq(domineEvents.tenantId, data.tenantId),
                eq(domineEvents.idempotencyKey, data.idempotencyKey)
            )).limit(1);

        if (existing.length > 0) {
            return { id: existing[0].id, inserted: false };
        }

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

    async lockEvent(id: string): Promise<boolean> {
        const db = await getDb();
        const [result] = await db.execute(sql`
            UPDATE domine_events 
            SET status = 'processing' 
            WHERE id = ${id} AND status IN ('queued', 'failed')
        `);
        return (result as any).affectedRows > 0;
    }

    async fetchProcessableEvents(limit: number = 50, tenantId?: string) {
        const db = await getDb();
        const now = new Date();
        const conditions = [
            inArray(domineEvents.status, ['queued', 'failed']),
            or(
                isNull(domineEvents.nextRetryAt),
                lte(domineEvents.nextRetryAt, now)
            )
        ];
        if (tenantId) {
            conditions.push(eq(domineEvents.tenantId, tenantId));
        }

        return db.select()
            .from(domineEvents)
            .where(and(...conditions))
            .orderBy(domineEvents.createdAt)
            .limit(limit);
    }

    async sendToDLQ(id: string, errorCode: string, errorMessage?: string, nextRetryAt?: Date, attempts?: number) {
        const db = await getDb();

        const setValues: any = {
            status: 'failed',
            errorCode,
            errorMessage: errorMessage ?? null,
            processedAt: new Date()
        };

        if (nextRetryAt !== undefined) {
            setValues.nextRetryAt = nextRetryAt;
        }
        if (attempts !== undefined) {
            setValues.attempts = attempts;
        }

        await db.update(domineEvents)
            .set(setValues)
            .where(eq(domineEvents.id, id));
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

    async listDLQEvents(tenantId: string, limit: number = 20, offset: number = 0) {
        const db = await getDb();
        return db.select()
            .from(domineEvents)
            .where(
                and(
                    eq(domineEvents.tenantId, tenantId),
                    eq(domineEvents.status, 'failed'),
                    isNull(domineEvents.nextRetryAt) // strictly DLQ (max retries reached or hard fail)
                )
            )
            .orderBy(desc(domineEvents.createdAt))
            .limit(limit)
            .offset(offset);
    }

    async resetDLQEvent(eventId: string, tenantId: string): Promise<boolean> {
        const db = await getDb();
        const [result] = await db.execute(sql`
            UPDATE domine_events 
            SET status = 'queued', attempts = 0, next_retry_at = NULL 
            WHERE id = ${eventId} AND tenant_id = ${tenantId} AND status = 'failed'
        `);
        return (result as any).affectedRows > 0;
    }

    async getDLQCount(tenantId: string): Promise<number> {
        const db = await getDb();
        const rows = await db.select({ count: domineEvents.id }).from(domineEvents)
            .where(
                and(
                    eq(domineEvents.tenantId, tenantId),
                    eq(domineEvents.status, 'failed'),
                    isNull(domineEvents.nextRetryAt)
                )
            );
        return rows.length;
    }

    async countBacklogQueued(tenantId: string): Promise<number> {
        const db = await getDb();
        const rows = await db.select({ count: domineEvents.id }).from(domineEvents)
            .where(and(eq(domineEvents.tenantId, tenantId), eq(domineEvents.status, 'queued')));
        return rows.length;
    }

    async countProcessedLastWindow(tenantId: string, hours: number = 24): Promise<number> {
        const db = await getDb();
        const windowStart = new Date(Date.now() - hours * 60 * 60 * 1000);
        const rows = await db.select({ count: domineEvents.id }).from(domineEvents)
            .where(and(
                eq(domineEvents.tenantId, tenantId),
                eq(domineEvents.status, 'processed'),
                sql`${domineEvents.processedAt} >= ${windowStart}`
            ));
        return rows.length;
    }
}

export const domineEventsRepository = new DomineEventsRepository();
