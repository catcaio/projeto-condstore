import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shipmentService } from '../shipment.service';
import * as dbInfra from '@/infra/db';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn(),
}));

describe('Shipment Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a shipment from a given order ID and emit SHIPMENT_CREATED', async () => {
        const mockOrder = {
            id: 'order-123',
            tenantId: 'tenant-1',
            customerId: 'custom-123',
            carrier: 'Correios',
            service: 'SEDEX',
            deliveryDeadline: 3
        };

        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn()
                .mockResolvedValueOnce([mockOrder]) // fetch order phase
                .mockResolvedValueOnce([]) // verify existing shipment
                .mockResolvedValueOnce([{ id: 'shipment-123', status: 'CREATED' }]), // fetch saved shipment
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockResolvedValue([{ insertId: 'shipment-123' }]),
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        const shipment = await shipmentService.createShipmentFromOrder('tenant-1', 'order-123');

        expect(shipment).toBeDefined();
        
        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            eventType: 'shipment_created',
            eventDomain: 'OPERATIONS',
            payload: expect.objectContaining({
                orderId: 'order-123',
                carrier: 'Correios'
            })
        }));
    });

    it('should update tracking details and emit shipment_status_updated', async () => {
        const mockShipment = { id: 'ship-1', orderId: 'order-1' };
        
        const mockDb = {
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([mockShipment])
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await shipmentService.updateShipmentStatus('tenant-1', 'ship-1', 'IN_TRANSIT', 'BR999', 'test.com');

        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'shipment_status_updated',
            payload: { orderId: 'order-1', shipmentId: 'ship-1', status: 'IN_TRANSIT' }
        }));
    });

    it('should throw an error if trying to create shipment for an invalid order', async () => {
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([]), // internal order missing
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await expect(
            shipmentService.createShipmentFromOrder('tenant-1', 'invalid-order')
        ).rejects.toThrow('Order not found');
    });
});
