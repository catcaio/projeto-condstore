import { eq, and } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { orders, type ShipmentRecord } from '@/drizzle/schema';
import { shipmentRepository, type ShipmentListFilter } from './shipment.repository';
import { shipmentEvents } from './shipment.events';

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

        // Verify idempotency
        const existing = await shipmentRepository.findShipmentByOrderId(tenantId, orderId);
        if (existing) {
            return existing;
        }

        const shipmentId = randomUUID();

        await shipmentRepository.insertShipment({
            id: shipmentId,
            tenantId,
            orderId,
            carrier: order.carrier || 'Unknown',
            service: order.service || undefined,
            estimatedDelivery: order.deliveryDeadline || undefined,
            status: 'CREATED'
        });

        const newShipment = await shipmentRepository.findShipmentById(tenantId, shipmentId);
        if (!newShipment) throw new Error('Failed to create shipment');

        await shipmentEvents.emitShipmentCreated({
            tenantId,
            shipmentId,
            orderId,
            carrier: order.carrier || 'Unknown',
            customerId: order.customerId || undefined
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
        const updateData: any = { status };
        if (trackingCode !== undefined) updateData.trackingCode = trackingCode;
        if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl;

        await shipmentRepository.updateShipment(tenantId, shipmentId, updateData);

        const shipment = await shipmentRepository.findShipmentById(tenantId, shipmentId);
        if (shipment) {
            await shipmentEvents.emitShipmentStatusUpdated({
                tenantId,
                shipmentId,
                orderId: shipment.orderId,
                status
            });
        }
    },

    async getShipmentByOrder(tenantId: string, orderId: string): Promise<ShipmentRecord | undefined> {
        return shipmentRepository.findShipmentByOrderId(tenantId, orderId);
    },

    async listShipments(tenantId: string, filter: ShipmentListFilter): Promise<ShipmentRecord[]> {
        return shipmentRepository.listShipments(tenantId, filter);
    }
};

export type { ShipmentListFilter };
