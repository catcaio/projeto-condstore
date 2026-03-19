import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { orders, simulations, conversations, crmOpportunities, crmQuotes, type OrderRecord } from '@/drizzle/schema';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { conversationService } from './conversation.service';
import { messageService } from './message.service';
import { shipmentService } from '@/modules/logistics/server';
import { redisClient } from '@/infra/redis.client';
import { logger } from '@/infra/logger';

export interface OrderListFilter {
    status?: string;
    conversationId?: string;
    limit?: number;
    offset?: number;
}

export const orderService = {
    async createOrderFromQuote(
        tenantId: string,
        conversationId: string,
        quoteId: string,
        operatorId: string
    ): Promise<OrderRecord> {
        const db = await getDb();
        const { randomUUID } = await import('crypto');

        // 1. Validate Quote
        const [quote] = await db.select()
            .from(simulations)
            .where(and(eq(simulations.tenantId, tenantId), eq(simulations.id, quoteId)))
            .limit(1);

        if (!quote) throw new Error('Quote not found');

        // Check commercial validity
        if (['EXPIRED', 'LOST', 'CANCELED'].includes(quote.status)) {
            throw new Error(`Cannot convert quote with status: ${quote.status}`);
        }

        if (quote.expiresAt && new Date(quote.expiresAt) < new Date()) {
            // Mark it as expired dynamically if past date
            await db.update(simulations).set({ status: 'EXPIRED' }).where(eq(simulations.id, quoteId));
            throw new Error('Cannot convert an expired quote');
        }

        // 2. Adquirir Lock Distribuído
        const lockKey = `lock:quote-to-order:${tenantId}:${quoteId}`;
        const lockToken = randomUUID(); // Token único para ownership do lock
        const acquired = await redisClient.setNx(lockKey, lockToken, 30); // 30s TTL

        if (!acquired) {
            logger.warn(`[OrderService] Falha ao adquirir lock para quote ${quoteId}. Possível double click ou concorrência.`, { lockKey });
            // Fallback de idempotência forte durante colisão de trava:
            const [concurrentOrder] = await db.select()
                .from(orders)
                .where(and(eq(orders.tenantId, tenantId), eq(orders.quoteId, quoteId)))
                .limit(1);
            if (concurrentOrder) {
                logger.info(`[OrderService] Ordem pré-existente capturada na recuperação do lock para quote ${quoteId}`);
                return concurrentOrder;
            }
            throw new Error('A cotação está sendo processada no momento. Por favor aguarde um instante.');
        }

        try {
            logger.info(`[OrderService] Lock adquirido para quote ${quoteId}`, { lockKey });

            // 1.5 Idempotency Guard (Lock garantido)
            const [existingOrder] = await db.select()
                .from(orders)
                .where(and(eq(orders.tenantId, tenantId), eq(orders.quoteId, quoteId)))
                .limit(1);

            if (existingOrder) {
                logger.info(`[OrderService] Ordem existente validada com o lock, protegendo duplicidade. Idempotência cumprida.`, { quoteId });
                return existingOrder;
            }

            // 2. Map logical fields
            const id = randomUUID();
            const price = quote.bestPrice ? Number(quote.bestPrice) : quote.sellingPrice ? Number(quote.sellingPrice) : null;
            const totalAmount = quote.totalAmount ? Number(quote.totalAmount) : price;
            const deliveryDeadline = quote.bestCarrier === 'Melhor Envio' ? 5 : 3; // placeholder estimation
            let orderId: string = id;

            // 3. Create Order
            try {
                await db.insert(orders).values({
                    id,
                    tenantId,
                    customerId: quote.customerId,
                    organizationId: quote.organizationId,
                    conversationId,
                    quoteId,
                    status: 'DRAFT',
                    carrier: quote.bestCarrier || 'Unknown Carrier',
                    service: quote.bestService || 'Standard',
                    price: price ? String(price) : null,
                    totalAmount: totalAmount ? String(totalAmount) : null,
                    deliveryDeadline: deliveryDeadline,
                    createdBy: operatorId,
                });
                logger.info(`[OrderService] Order inserida no banco de dados. orderId=${id} para quoteId=${quoteId}`);
            } catch (err: any) {
                // Fallback proteção de banco (Restrição de unique key)
                if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062 || (err.message && err.message.includes('Duplicate entry'))) {
                    logger.warn(`[OrderService] Interceptada ER_DUP_ENTRY (Unique key violation) ao rodar db.insert para quote ${quoteId}`);
                    const [fallbackOrder] = await db.select()
                        .from(orders)
                        .where(and(eq(orders.tenantId, tenantId), eq(orders.quoteId, quoteId)))
                        .limit(1);
                    if (fallbackOrder) {
                        // Oponente venceu a corrida e inseriu; este contexto virou follower tardio
                        logger.info(`[OrderService] Abortando side-effects de winner pois o banco já possuía a order (Fallback concluído)`);
                        return fallbackOrder;
                    } else {
                        // Se não encontrar o pedido existente, propaga o erro original
                        throw err;
                    }
                } else {
                    throw err;
                }
            }

            // 3.5 Update Quote Status to CONVERTED
            await db.update(simulations).set({ 
                status: 'CONVERTED', 
                convertedAt: new Date() 
            }).where(and(eq(simulations.tenantId, tenantId), eq(simulations.id, quoteId)));

            const [newOrder] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

            // 4. Update Conversation Stage to WON
            await conversationService.changeConversationStage(tenantId, conversationId, 'WON', quote.customerId || undefined);

            // 4.5 Sync CRM Opportunity and Quote
            const quoteResult = await db.select().from(crmQuotes).where(and(eq(crmQuotes.tenantId, tenantId), eq(crmQuotes.id, quoteId))).limit(1);
            const crmQuote = quoteResult[0];
            if (crmQuote && crmQuote.opportunityId) {
                await db.update(crmOpportunities)
                    .set({ stage: 'won', status: 'won', lastActivityAt: new Date() })
                    .where(eq(crmOpportunities.id, crmQuote.opportunityId));
                
                await db.update(crmQuotes)
                    .set({ status: 'accepted', updatedAt: new Date() })
                    .where(eq(crmQuotes.id, quoteId));
            }

            // 5. Emit Timeline Event
            await publishOperationalEvent({
                tenantId,
                eventType: 'order_created',
                eventDomain: 'CONVERSION',
                customerId: quote.customerId || undefined,
                payload: {
                    orderId: orderId,
                    quoteId,
                    conversationId,
                    price,
                    carrier: quote.bestCarrier,
                }
            });

            return newOrder;
        } finally {
            // Compare and Delete Atômico local-helper para liberar lock seguro
            try {
                const luaScript = `
                    if redis.call("get", KEYS[1]) == ARGV[1] then
                        return redis.call("del", KEYS[1])
                    else
                        return 0
                    end
                `;
                // Para alinhar exatamente com o Redis caso a string já esteja escapada ou em raw pelo driver:
                const rawToken = lockToken;
                await redisClient.eval(luaScript, 1, lockKey, rawToken);
                logger.info(`[OrderService] Lock release tentado para quote ${quoteId}`, { lockKey });
            } catch (err) {
                logger.error(`[OrderService] Erro ao liberar lock: ${err}`);
            }
        }
    },

    async updateOrderStatus(
        tenantId: string,
        orderId: string,
        status: 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED'
    ): Promise<void> {
        const db = await getDb();
        const [order] = await db.select().from(orders).where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId))).limit(1);
        
        if (!order) throw new Error('Order not found');

        if (order.status === status) return; // Silent discard

        // Prevent illegal backwards transitions
        const ranks: Record<string, number> = {
            'DRAFT': 1,
            'CONFIRMED': 2,
            'PROCESSING': 3,
            'SHIPPED': 4,
            'DELIVERED': 5
        };

        if (status !== 'CANCELED' && order.status !== 'CANCELED') {
            const currentRank = ranks[order.status] || 0;
            const newRank = ranks[status] || 0;
            if (newRank <= currentRank) {
                throw new Error(`Cannot regress order status from ${order.status} to ${status}`);
            }
        }

        if (order.status === 'DELIVERED' || order.status === 'CANCELED') {
            throw new Error(`Cannot change status of a ${order.status} order`);
        }
        
        await db.update(orders)
            .set({ status })
            .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)));

        // If order just got CONFIRMED, spawn its shipment
        if (status === 'CONFIRMED') {
            await shipmentService.createShipmentFromOrder(tenantId, orderId);
        }

        // Timeline Operational Logging
        if (['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELED'].includes(status) && order.conversationId) {
            const statusLabels: Record<string, string> = {
                'CONFIRMED': 'confirmado e enviado para separação',
                'SHIPPED': 'entregue à transportadora',
                'DELIVERED': 'marcado como entregue ao cliente',
                'CANCELED': 'cancelado'
            };
            await messageService.processSystemEvent(
                tenantId,
                order.conversationId,
                `📍 Pedido #${order.id.split('-')[0]} foi ${statusLabels[status]}.`,
                { event: `order_${status.toLowerCase()}` }
            );
        }

        // Emit relevant event based on status
        let eventType: 'order_confirmed' | 'order_cancelled' | 'order_status_updated' = 'order_status_updated';
        if (status === 'CONFIRMED') eventType = 'order_confirmed';
        if (status === 'CANCELED') eventType = 'order_cancelled';

        await publishOperationalEvent({
            tenantId,
            eventType,
            eventDomain: 'OPERATIONS',
            customerId: order.customerId || undefined,
            payload: {
                orderId,
                status
            }
        });
    },

    async getOrderById(tenantId: string, orderId: string): Promise<OrderRecord | undefined> {
        const db = await getDb();
        const [order] = await db.select()
            .from(orders)
            .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)))
            .limit(1);
        return order;
    },

    async listOrders(tenantId: string, filter: OrderListFilter): Promise<OrderRecord[]> {
        const db = await getDb();
        
        const conditions = [eq(orders.tenantId, tenantId)];
        if (filter.status) {
            conditions.push(eq(orders.status, filter.status));
        }
        if (filter.conversationId) {
            conditions.push(eq(orders.conversationId, filter.conversationId));
        }

        return db.select()
            .from(orders)
            .where(and(...conditions))
            .orderBy(desc(orders.createdAt))
            .limit(Math.min(filter.limit || 50, 100))
            .offset(filter.offset || 0);
    }
};
