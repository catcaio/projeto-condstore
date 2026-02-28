import { getDb } from '@/infra/db';
import { domineOrders, domineFreightQuotes } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export class DomineReadRepository {
    async upsertOrder(tenantId: string, orderId: string, status: string, totals: any) {
        const db = await getDb();
        const existing = await db.select().from(domineOrders).where(and(eq(domineOrders.tenantId, tenantId), eq(domineOrders.orderId, orderId))).limit(1);
        if (existing.length) {
            await db.update(domineOrders).set({ status, totals, updatedAt: new Date() }).where(eq(domineOrders.id, existing[0].id));
        } else {
            await db.insert(domineOrders).values({
                id: crypto.randomUUID(),
                tenantId,
                orderId,
                status,
                totals,
                updatedAt: new Date()
            });
        }
    }

    async upsertFreightQuote(tenantId: string, quoteId: string, summary: any, orderId?: string) {
        const db = await getDb();
        const existing = await db.select().from(domineFreightQuotes).where(and(eq(domineFreightQuotes.tenantId, tenantId), eq(domineFreightQuotes.quoteId, quoteId))).limit(1);
        if (existing.length) {
            await db.update(domineFreightQuotes).set({ summary, orderId: orderId || existing[0].orderId }).where(eq(domineFreightQuotes.id, existing[0].id));
        } else {
            await db.insert(domineFreightQuotes).values({
                id: crypto.randomUUID(),
                tenantId,
                quoteId,
                orderId: orderId || null,
                summary,
            });
        }
    }

    async getOrder(tenantId: string, orderId: string) {
        const db = await getDb();
        const ro = await db.select().from(domineOrders).where(and(eq(domineOrders.tenantId, tenantId), eq(domineOrders.orderId, orderId))).limit(1);
        return ro[0];
    }

    async listOrders(tenantId: string, limit = 50) {
        const db = await getDb();
        return db.select().from(domineOrders).where(eq(domineOrders.tenantId, tenantId)).limit(limit);
    }
}

export const domineReadRepository = new DomineReadRepository();
