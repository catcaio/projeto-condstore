import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { shipments, orders, type ShipmentRecord } from '@/drizzle/schema';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export interface ShipmentListFilter {
    status?: string;
    limit?: number;
    offset?: number;
}

export const shipmentService = {
    async createShipmentFromOrder(tenantId: string, orderId: string): Promise<ShipmentRecord> {
        const db = await getDb();
        const { randomUUID } = await import('crypto');

        // Verify order
        const [order] = await db.select()
            .from(orders)
            .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)))
            .limit(1);

        if (!order) throw new Error('Order not found');

        // Verify if shipment already exists
        const [existing] = await db.select()
            .from(shipments)
            .where(and(eq(shipments.tenantId, tenantId), eq(shipments.orderId, orderId)))
            .limit(1);

        if (existing) {
            return existing; // idempotency
        }

        const shipmentId = randomUUID();

        await db.insert(shipments).values({
            id: shipmentId,
            tenantId,
            orderId,
            carrier: order.carrier || 'Unknown',
            service: order.service || undefined,
            estimatedDelivery: order.deliveryDeadline || undefined,
            status: 'CREATED'
        });

        const [newShipment] = await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);

        await publishOperationalEvent({
            tenantId,
            eventType: 'shipment_created',
            eventDomain: 'OPERATIONS',
            customerId: order.customerId || undefined,
            payload: {
                shipmentId,
                orderId,
                carrier: order.carrier
            }
        });

        return newShipment;
    },

    async updateShipmentStatus(
        tenantId: string,
        shipmentId: string,
        status: 'CREATED' | 'SCHEDULED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED',
        trackingCode?: string,
        trackingUrl?: string
    ): Promise<void> {
        const db = await getDb();
        
        const updateData: any = { status };
        if (trackingCode !== undefined) updateData.trackingCode = trackingCode;
        if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl;

        await db.update(shipments)
            .set(updateData)
            .where(and(eq(shipments.tenantId, tenantId), eq(shipments.id, shipmentId)));

        const [shipment] = await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);

        let eventType: 'shipment_delivered' | 'shipment_status_updated' = 'shipment_status_updated';
        if (status === 'DELIVERED') eventType = 'shipment_delivered';

        if (shipment) {
            await publishOperationalEvent({
                tenantId,
                eventType,
                eventDomain: 'OPERATIONS',
                payload: {
                    shipmentId,
                    orderId: shipment.orderId,
                    status
                }
            });
        }
    },

    async getShipmentByOrder(tenantId: string, orderId: string): Promise<ShipmentRecord | undefined> {
        const db = await getDb();
        const [shipment] = await db.select()
            .from(shipments)
            .where(and(eq(shipments.tenantId, tenantId), eq(shipments.orderId, orderId)))
            .limit(1);
        return shipment;
    },

    async listShipments(tenantId: string, filter: ShipmentListFilter): Promise<ShipmentRecord[]> {
        const db = await getDb();
        
        const conditions = [eq(shipments.tenantId, tenantId)];
        if (filter.status) {
            conditions.push(eq(shipments.status, filter.status));
        }

        return db.select()
            .from(shipments)
            .where(and(...conditions))
            .orderBy(desc(shipments.createdAt))
            .limit(Math.min(filter.limit || 50, 100))
            .offset(filter.offset || 0);
    }
};
