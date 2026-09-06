import { z } from 'zod';
import { deliveriesRepository } from '@/infra/repositories/deliveries.repository';
import { getShipmentById } from '@/modules/freight/server';
import { executeFrankTool } from '../tool-guard';
import { FrankToolContract } from '../frank-tool.contract';
import { frankToolRegistry } from '../frank-tool.registry';

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

export const getShipmentStatusInputSchema = z.object({
    tenantId: z.string().min(1, 'tenantId is required'),
    shipmentId: z.string().min(1, 'shipmentId is required'),
});

export const getShipmentStatusOutputSchema = z.object({
    shipment: z.any(),
    carrier: z.object({
        name: z.string(),
        service: z.string(),
    }),
    trackingToken: z.string().nullable(),
    deliveryStatus: z.string(),
    lastLocationEvent: z.object({
        lat: z.string(),
        lng: z.string(),
        accuracy: z.number().nullable(),
        recordedAt: z.any(),
    }).nullable(),
}).nullable();

export const getShipmentStatusContract: FrankToolContract<GetShipmentStatusParams, ShipmentStatusResult | null> = {
    name: 'get_shipment_status',
    description: 'Fetches shipment details, carrier info, tracking token, and real-time delivery status.',
    inputSchema: getShipmentStatusInputSchema,
    outputSchema: getShipmentStatusOutputSchema,
    isReadOnly: true,
    riskClass: 'SAFE',
    capabilities: ['READ', 'QUERY'],
    sideEffects: ['NONE'],
    execute: async (input) => {
        return getShipmentStatusTool(input);
    },
};

frankToolRegistry.registerTool(getShipmentStatusContract);

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
                ? await deliveriesRepository.findLatestLocationEvent(params.tenantId, delivery.id)
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
