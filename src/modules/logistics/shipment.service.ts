import { getDb, withTenantIdNotDeleted } from '@/infra/db';
import { orders, type ShipmentRecord } from '@/drizzle/schema';
import { shipmentRepository } from './shipment.repository';
import type { ShipmentListFilter } from './shipment.repository';
import { shipmentEvents } from './shipment.events';
import { ecosystemEventsService } from '@/services/ecosystem-events.service';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import {
    deliveredShipmentChangeMessage,
    SHIPMENT_FLOW_MESSAGES,
    shipmentStatusRegressionMessage,
} from './shipment.contract';

export type ShipmentStatus = 'CREATED' | 'SCHEDULED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
type OrderLifecycleStatus = 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED';

const SHIPMENT_STATUS_RANKS: Partial<Record<ShipmentStatus, number>> = {
    CREATED: 1,
    SCHEDULED: 2,
    PICKED_UP: 3,
    IN_TRANSIT: 4,
    OUT_FOR_DELIVERY: 5,
    DELIVERED: 6,
};

const ORDER_STATUS_RANKS: Record<OrderLifecycleStatus, number> = {
    DRAFT: 1,
    CONFIRMED: 2,
    PROCESSING: 3,
    SHIPPED: 4,
    DELIVERED: 5,
    CANCELED: 6,
};

const SHIPMENT_TO_ORDER_STATUS: Partial<Record<ShipmentStatus, Extract<OrderLifecycleStatus, 'SHIPPED' | 'DELIVERED'>>> = {
    IN_TRANSIT: 'SHIPPED',
    OUT_FOR_DELIVERY: 'SHIPPED',
    DELIVERED: 'DELIVERED',
};

const ORDER_STATUS_LABELS: Record<Extract<OrderLifecycleStatus, 'SHIPPED' | 'DELIVERED'>, string> = {
    SHIPPED: 'entregue à transportadora',
    DELIVERED: 'marcado como entregue ao cliente',
};

async function syncOrderStatusFromShipment(
    tenantId: string,
    orderId: string,
    nextStatus: Extract<OrderLifecycleStatus, 'SHIPPED' | 'DELIVERED'>,
    shipmentStatus: ShipmentStatus,
) {
    const db = await getDb();
    const [order] = await db.select()
        .from(orders)
        .where(withTenantIdNotDeleted(orders, tenantId, orderId))
        .limit(1);

    if (!order) {
        return;
    }

    if (['DELIVERED', 'CANCELED'].includes(order.status)) {
        return;
    }

    const currentRank = ORDER_STATUS_RANKS[order.status as OrderLifecycleStatus] ?? 0;
    const nextRank = ORDER_STATUS_RANKS[nextStatus];

    if (nextRank <= currentRank) {
        return;
    }

    await db.update(orders)
        .set({ status: nextStatus })
        .where(withTenantIdNotDeleted(orders, tenantId, orderId));

    if (order.conversationId) {
        const { messageService } = await import('@/modules/atendimento/message.service');
        await messageService.processSystemEvent(
            tenantId,
            order.conversationId,
            `📍 Pedido #${order.id.split('-')[0]} foi ${ORDER_STATUS_LABELS[nextStatus]}.`,
            {
                event: `order_${nextStatus.toLowerCase()}`,
                sourceShipmentStatus: shipmentStatus,
            }
        );
    }

    await publishOperationalEvent({
        tenantId,
        eventType: 'order_status_updated',
        eventDomain: 'OPERATIONS',
        customerId: order.customerId || undefined,
        payload: {
            orderId,
            status: nextStatus,
            sourceShipmentStatus: shipmentStatus,
        }
    });
}

export const shipmentService = {
    async createShipmentFromOrder(tenantId: string, orderId: string): Promise<ShipmentRecord> {
        const db = await getDb();
        const { randomUUID } = await import('crypto');

        // Verify order
        const [order] = await db.select()
            .from(orders)
            .where(withTenantIdNotDeleted(orders, tenantId, orderId))
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

        // Emit ecosystem event
        ecosystemEventsService.emitEvent({
            tenantId,
            type: 'shipment_created',
            entityType: 'shipment',
            entityId: shipmentId,
            payload: { orderId, carrier: order.carrier || 'Unknown' },
            actor: 'system',
            source: 'logistics',
        }).catch(() => {});

        return newShipment;
    },

    async updateShipmentStatus(
        tenantId: string,
        shipmentId: string,
        status: ShipmentStatus,
        trackingCode?: string,
        trackingUrl?: string
    ): Promise<void> {
        const currentShipment = await shipmentRepository.findShipmentById(tenantId, shipmentId);
        if (!currentShipment) {
            throw new Error(SHIPMENT_FLOW_MESSAGES.shipmentNotFound);
        }

        if (currentShipment.status === 'DELIVERED' && status !== 'DELIVERED') {
            throw new Error(deliveredShipmentChangeMessage());
        }

        const currentRank = SHIPMENT_STATUS_RANKS[currentShipment.status as ShipmentStatus];
        const nextRank = SHIPMENT_STATUS_RANKS[status];
        if (
            currentRank !== undefined &&
            nextRank !== undefined &&
            nextRank < currentRank
        ) {
            throw new Error(shipmentStatusRegressionMessage(currentShipment.status, status));
        }

        const isSameStatus = currentShipment.status === status;
        const hasTrackingUpdate = trackingCode !== undefined || trackingUrl !== undefined;
        if (isSameStatus && !hasTrackingUpdate) {
            return;
        }

        const updateData: { status: string; trackingCode?: string; trackingUrl?: string } = { status };
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

            // Emit shipment_delayed if status is FAILED
            if (status === 'FAILED') {
                ecosystemEventsService.emitEvent({
                    tenantId,
                    type: 'shipment_delayed',
                    entityType: 'shipment',
                    entityId: shipmentId,
                    payload: { orderId: shipment.orderId, status },
                    actor: 'system',
                    source: 'logistics',
                }).catch(() => {});
            }

            const promotedOrderStatus = SHIPMENT_TO_ORDER_STATUS[status];
            if (promotedOrderStatus) {
                await syncOrderStatusFromShipment(
                    tenantId,
                    shipment.orderId,
                    promotedOrderStatus,
                    status
                );
            }
        }
    },

    async getShipmentByOrder(tenantId: string, orderId: string): Promise<ShipmentRecord | undefined> {
        return shipmentRepository.findShipmentByOrderId(tenantId, orderId);
    },

    async listShipments(tenantId: string, filter: ShipmentListFilter): Promise<ShipmentRecord[]> {
        return shipmentRepository.listShipments(tenantId, filter);
    }
};
