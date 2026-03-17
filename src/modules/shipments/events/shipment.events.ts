import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export const shipmentEvents = {
    async emitShipmentCreated(params: {
        tenantId: string;
        shipmentId: string;
        orderId: string;
        carrier: string;
        customerId?: string;
    }): Promise<void> {
        await publishOperationalEvent({
            tenantId: params.tenantId,
            eventType: 'shipment_created',
            eventDomain: 'OPERATIONS',
            customerId: params.customerId,
            payload: {
                shipmentId: params.shipmentId,
                orderId: params.orderId,
                carrier: params.carrier
            }
        });
    },

    async emitShipmentStatusUpdated(params: {
        tenantId: string;
        shipmentId: string;
        orderId: string;
        status: string;
    }): Promise<void> {
        let eventType: 'shipment_delivered' | 'shipment_status_updated' = 'shipment_status_updated';
        if (params.status === 'DELIVERED') {
            eventType = 'shipment_delivered';
        }

        await publishOperationalEvent({
            tenantId: params.tenantId,
            eventType,
            eventDomain: 'OPERATIONS',
            payload: {
                shipmentId: params.shipmentId,
                orderId: params.orderId,
                status: params.status
            }
        });
    }
};
