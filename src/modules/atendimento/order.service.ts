import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { orders, simulations, conversations, type OrderRecord } from '@/drizzle/schema';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { conversationService } from './conversation.service';
import { shipmentService } from '@/modules/logistics/shipment.service';

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

        // 2. Map logical fields
        const id = randomUUID();
        const price = quote.bestPrice ? Number(quote.bestPrice) : quote.sellingPrice ? Number(quote.sellingPrice) : null;
        const deliveryDeadline = quote.bestCarrier === 'Melhor Envio' ? 5 : 3; // placeholder estimation

        // 3. Create Order
        await db.insert(orders).values({
            id,
            tenantId,
            customerId: quote.customerId,
            organizationId: quote.organizationId,
            conversationId,
            quoteId,
            status: 'CREATED',
            carrier: quote.bestCarrier || 'Unknown Carrier',
            service: quote.bestService || 'Standard',
            price: price ? String(price) : null,
            deliveryDeadline: deliveryDeadline,
            createdBy: operatorId,
        });

        const [newOrder] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

        // 4. Update Conversation Stage to WON
        await conversationService.changeConversationStage(tenantId, conversationId, 'WON', quote.customerId || undefined);

        // 5. Emit Timeline Event
        await publishOperationalEvent({
            tenantId,
            eventType: 'order_created',
            eventDomain: 'CONVERSION',
            customerId: quote.customerId || undefined,
            payload: {
                orderId: id,
                quoteId,
                conversationId,
                price,
                carrier: quote.bestCarrier,
            }
        });

        return newOrder;
    },

    async updateOrderStatus(
        tenantId: string,
        orderId: string,
        status: 'CREATED' | 'CONFIRMED' | 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
    ): Promise<void> {
        const db = await getDb();
        
        await db.update(orders)
            .set({ status })
            .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)));

        const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

        // If order just got CONFIRMED, spawn its shipment
        if (status === 'CONFIRMED') {
            await shipmentService.createShipmentFromOrder(tenantId, orderId);
        }

        // Emit relevant event based on status
        let eventType: 'order_confirmed' | 'order_cancelled' | 'order_status_updated' = 'order_status_updated';
        if (status === 'CONFIRMED') eventType = 'order_confirmed';
        if (status === 'CANCELLED') eventType = 'order_cancelled';

        await publishOperationalEvent({
            tenantId,
            eventType,
            eventDomain: 'OPERATIONS',
            customerId: order?.customerId || undefined,
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
