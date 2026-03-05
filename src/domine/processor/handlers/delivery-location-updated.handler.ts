import { EventHandler, EventHandlerResult } from '../dispatcher';
import { deliveriesRepository } from '../../../infra/repositories/deliveries.repository';
import { structuredLogger } from '../../../infra/log/logger';

export const deliveryLocationUpdatedHandler: EventHandler = {
    eventType: 'DELIVERY_LOCATION_UPDATED',

    async handle(event): Promise<EventHandlerResult> {
        const payload = event.payloadJson as any;

        const deliveryId = payload?.deliveryId;
        const lat = payload?.lat;
        const lng = payload?.lng;

        if (!deliveryId || lat === undefined || lng === undefined) {
            structuredLogger.warn('invalid_delivery_location_payload', { payload });
            return { ok: false, error: 'Missing deliveryId, lat, or lng in payload' };
        }

        try {
            await deliveriesRepository.recordLocationUpdate({
                tenantId: event.tenantId,
                deliveryId: deliveryId,
                lat: Number(lat),
                lng: Number(lng),
                accuracy: payload.accuracy ? Number(payload.accuracy) : undefined,
            });
            return { ok: true };
        } catch (error: any) {
            return { ok: false, error: error.message || 'Failed to upsert delivery location' };
        }
    }
};
