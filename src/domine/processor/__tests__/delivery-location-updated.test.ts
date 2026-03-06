import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deliveryLocationUpdatedHandler } from '../handlers/delivery-location-updated.handler';
import { deliveriesRepository } from '../../../infra/repositories/deliveries.repository';
import { structuredLogger } from '../../../infra/log/logger';

vi.mock('../../../infra/repositories/deliveries.repository', () => ({
    deliveriesRepository: {
        recordLocationUpdate: vi.fn(),
    }
}));

vi.mock('../../../infra/log/logger', () => ({
    structuredLogger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    }
}));

describe('Delivery Location Updated Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully update valid location', async () => {
        (deliveriesRepository.recordLocationUpdate as any).mockResolvedValueOnce(undefined);

        const result = await deliveryLocationUpdatedHandler.handle({
            id: 'ev-1',
            tenantId: 'tenant-1',
            type: 'DELIVERY_LOCATION_UPDATED',
            source: 'webhook',
            payloadJson: {
                deliveryId: 'del-1',
                lat: -23.5505,
                lng: -46.6333,
                accuracy: 10
            }
        });

        expect(result.ok).toBe(true);
        expect(deliveriesRepository.recordLocationUpdate).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            deliveryId: 'del-1',
            lat: -23.5505,
            lng: -46.6333,
            accuracy: 10
        });
    });

    it('should fail if required fields are missing', async () => {
        const result = await deliveryLocationUpdatedHandler.handle({
            id: 'ev-1',
            tenantId: 'tenant-1',
            type: 'DELIVERY_LOCATION_UPDATED',
            source: 'webhook',
            payloadJson: {
                deliveryId: 'del-1',
                // missing lat and lng
            }
        });

        expect(result.ok).toBe(false);
        expect(result.error).toContain('Missing');
        expect(structuredLogger.warn).toHaveBeenCalled();
        expect(deliveriesRepository.recordLocationUpdate).not.toHaveBeenCalled();
    });

    it('should gracefully handle repository errors', async () => {
        (deliveriesRepository.recordLocationUpdate as any).mockRejectedValueOnce(new Error('DB Error'));

        const result = await deliveryLocationUpdatedHandler.handle({
            id: 'ev-1',
            tenantId: 'tenant-1',
            type: 'DELIVERY_LOCATION_UPDATED',
            source: 'webhook',
            payloadJson: {
                deliveryId: 'del-1',
                lat: 0,
                lng: 0,
            }
        });

        expect(result.ok).toBe(false);
        expect(result.error).toBe('DB Error');
    });
});
