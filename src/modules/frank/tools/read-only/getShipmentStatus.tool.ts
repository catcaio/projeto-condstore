import { deliveriesRepository } from '@/infra/repositories/deliveries.repository';
import { getShipmentById } from '@/modules/shipments';
import { executeFrankTool } from '../tool-guard';

export interface ShipmentLocationEventSummary {
    lat: string;
    lng: string;
    accuracy: number | null;
    recordedAt: Date;
}

export interface ShipmentStatusResult {
    shipment: NonNullable<Awaited<ReturnType<typeof getShipmentById>>>;
    carrier: {
        name: string;
        service: string;
    };
    trackingToken: string | null;
    deliveryStatus: string;
    lastLocationEvent: ShipmentLocationEventSummary | null;
}

export interface GetShipmentStatusParams {
    tenantId: string;
    shipmentId: string;
}

export async function getShipmentStatusTool(
    params: GetShipmentStatusParams,
): Promise<ShipmentStatusResult | null> {
    return executeFrankTool({
        tenantId: params.tenantId,
        toolName: 'get_shipment_status',
        access: 'read_only',
        run: async () => {
            const shipment = await getShipmentById(params.tenantId, params.shipmentId);

            if (!shipment) {
                return null;
            }

            const delivery = shipment.orderId
                ? await deliveriesRepository.findLatestDeliveryByOrderRef(
                    params.tenantId,
                    shipment.orderId,
                )
                : null;

            const locationEvent = delivery
                ? await deliveriesRepository.findLatestLocationEvent(delivery.id)
                : null;

            const lastLocationEvent = locationEvent
                ? {
                    lat: locationEvent.lat,
                    lng: locationEvent.lng,
                    accuracy: locationEvent.accuracy ?? null,
                    recordedAt: locationEvent.recordedAt,
                }
                : delivery?.lastLat && delivery.lastLng && delivery.lastUpdateAt
                    ? {
                        lat: delivery.lastLat,
                        lng: delivery.lastLng,
                        accuracy: null,
                        recordedAt: delivery.lastUpdateAt,
                    }
                    : null;

            return {
                shipment,
                carrier: {
                    name: shipment.carrier,
                    service: shipment.service,
                },
                trackingToken: shipment.trackingCode,
                deliveryStatus: delivery?.status ?? shipment.status,
                lastLocationEvent,
            };
        },
    });
}
