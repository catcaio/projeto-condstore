import { getDb } from '@/infra/db';
import { domineOrders, domineFreightQuotes } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { structuredLogger } from '@/infra/log/logger';

export type UpsertFreightQuoteInput = {
    tenantId: string;
    correlationId: string;
    requestId?: string | null;
    source?: string;
    originZip?: string | null;
    destZip?: string | null;
    weight?: number | null;
    dims?: string | null;
    quotesJsonRedacted?: any | null;
    bestCarrier?: string | null;
    bestPriceCents?: number | null;
    bestEtaDays?: number | null;
};

export class DomineReadRepository {
    async upsertOrder(tenantId: string, orderId: string, status: string, totals: any) {
        const db = await getDb();
        const existing = await db.select().from(domineOrders).where(and(eq(domineOrders.tenantId, tenantId), eq(domineOrders.orderId, orderId)));
        if (existing.length) {
            await db.update(domineOrders).set({ status, totals, updatedAt: new Date() }).where(and(
                eq(domineOrders.id, existing[0].id),
                eq(domineOrders.tenantId, tenantId),
            ));
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

    async upsertFreightQuoteReadModel(input: UpsertFreightQuoteInput): Promise<void> {
        try {
            const db = await getDb();
            const { tenantId, correlationId } = input;

            const existing = await db
                .select()
                .from(domineFreightQuotes)
                .where(
                    and(
                        eq(domineFreightQuotes.tenantId, tenantId),
                        eq(domineFreightQuotes.correlationId, correlationId)
                    )
                )
                ;

            if (existing.length > 0) {
                await db
                    .update(domineFreightQuotes)
                    .set({
                        requestId: input.requestId ?? existing[0].requestId,
                        source: input.source ?? existing[0].source,
                        originZip: input.originZip ?? existing[0].originZip,
                        destZip: input.destZip ?? existing[0].destZip,
                        weight: input.weight ?? existing[0].weight,
                        dims: input.dims ?? existing[0].dims,
                        quotesJsonRedacted: input.quotesJsonRedacted ?? existing[0].quotesJsonRedacted,
                        bestCarrier: input.bestCarrier ?? existing[0].bestCarrier,
                        bestPriceCents: input.bestPriceCents ?? existing[0].bestPriceCents,
                        bestEtaDays: input.bestEtaDays ?? existing[0].bestEtaDays,
                    })
                    .where(and(
                        eq(domineFreightQuotes.id, existing[0].id),
                        eq(domineFreightQuotes.tenantId, tenantId),
                    ));

                structuredLogger.info('domine_freight_quote_updated', { tenantId, correlationId });
            } else {
                const newId = crypto.randomUUID();
                await db.insert(domineFreightQuotes).values({
                    id: newId,
                    tenantId,
                    correlationId,
                    requestId: input.requestId ?? null,
                    source: input.source ?? 'unknown',
                    originZip: input.originZip ?? null,
                    destZip: input.destZip ?? null,
                    weight: input.weight ?? null,
                    dims: input.dims ?? null,
                    quotesJsonRedacted: input.quotesJsonRedacted ?? null,
                    bestCarrier: input.bestCarrier ?? null,
                    bestPriceCents: input.bestPriceCents ?? null,
                    bestEtaDays: input.bestEtaDays ?? null,
                    createdAt: new Date(),
                });

                structuredLogger.info('domine_freight_quote_inserted', { tenantId, correlationId });
            }
        } catch (error: any) {
            structuredLogger.error('domine_freight_quote_upsert_failed', {
                tenantId: input.tenantId,
                correlationId: input.correlationId,
                error: error.message
            });
            throw error;
        }
    }

    async getLatestFreightQuotes(tenantId: string, limit: number = 50) {
        const db = await getDb();
        return db
            .select()
            .from(domineFreightQuotes)
            .where(eq(domineFreightQuotes.tenantId, tenantId))
            .orderBy(desc(domineFreightQuotes.createdAt))
            .limit(limit);
    }

    async getFreightQuoteByCorrelationId(tenantId: string, correlationId: string) {
        const db = await getDb();
        const [record] = await db
            .select()
            .from(domineFreightQuotes)
            .where(
                and(
                    eq(domineFreightQuotes.tenantId, tenantId),
                    eq(domineFreightQuotes.correlationId, correlationId)
                )
            );
        return record || null;
    }

    async getOrder(tenantId: string, orderId: string) {
        const db = await getDb();
        const ro = await db.select().from(domineOrders).where(and(eq(domineOrders.tenantId, tenantId), eq(domineOrders.orderId, orderId)));
        return ro[0];
    }

    async listOrders(tenantId: string, limit = 50) {
        const db = await getDb();
        return db.select().from(domineOrders).where(eq(domineOrders.tenantId, tenantId)).limit(limit);
    }
}

export const domineReadRepository = new DomineReadRepository();
