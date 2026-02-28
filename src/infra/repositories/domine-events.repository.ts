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

    async sendToDLQ(id: string, errorCode: string, errorMessage?: string) {
        const db = await getDb();
        await db.update(domineEvents)
            .set({ status: 'failed', errorCode, errorMessage: errorMessage ?? null, processedAt: new Date() })
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

    async getDLQCount(tenantId: string): Promise<number> {
        const db = await getDb();
        const rows = await db.select({ count: domineEvents.id }).from(domineEvents)
            .where(and(eq(domineEvents.tenantId, tenantId), eq(domineEvents.status, 'failed')));
        return rows.length;
    }
}

export const domineEventsRepository = new DomineEventsRepository();
