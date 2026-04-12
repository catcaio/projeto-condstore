import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shipmentService } from '../shipment.service';
import { shipmentRepository } from '../shipment.repository';
import { shipmentEvents } from '../shipment.events';
import * as dbInfra from '@/infra/db';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

vi.mock('@/infra/db', async () => {
    const actual = await vi.importActual<typeof import('@/infra/db')>('@/infra/db');
    return {
        ...actual,
        getDb: vi.fn(),
    };
});

vi.mock('../shipment.repository', () => ({
    shipmentRepository: {
        findShipmentById: vi.fn(),
        findShipmentByOrderId: vi.fn(),
        insertShipment: vi.fn(),
        updateShipment: vi.fn(),
        listShipments: vi.fn(),
    }
}));

vi.mock('../shipment.events', () => ({
    shipmentEvents: {
        emitShipmentCreated: vi.fn(),
        emitShipmentStatusUpdated: vi.fn(),
    }
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn(),
}));

vi.mock('@/modules/atendimento/message.service', () => ({
    messageService: {
        processSystemEvent: vi.fn().mockResolvedValue(undefined),
    }
}));

vi.mock('crypto', () => ({
    randomUUID: vi.fn(() => 'shipment-123')
}));

describe('Shipment Logistics Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a shipment from a given order ID and trigger event via emitter', async () => {
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
            limit: vi.fn().mockResolvedValue([mockOrder]) // fetch order phase
        };
        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        vi.mocked(shipmentRepository.findShipmentByOrderId).mockResolvedValue(undefined);
        vi.mocked(shipmentRepository.insertShipment).mockResolvedValue();
        vi.mocked(shipmentRepository.findShipmentById).mockResolvedValue({ id: 'shipment-123', status: 'CREATED' } as any);

        const shipment = await shipmentService.createShipmentFromOrder('tenant-1', 'order-123');

        expect(shipment).toBeDefined();
        
        expect(shipmentEvents.emitShipmentCreated).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            shipmentId: 'shipment-123',
            orderId: 'order-123',
            carrier: 'Correios'
        }));
    });

    it('should emit idempotency and return existing shipment if one already exists for the order', async () => {
        const mockOrder = { id: 'o-44', tenantId: 'tenant-1' };
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([mockOrder])
        };
        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        const existingShipment: any = { id: 'ship-ext', orderId: 'o-44' };
        vi.mocked(shipmentRepository.findShipmentByOrderId).mockResolvedValue(existingShipment);

        const shipment = await shipmentService.createShipmentFromOrder('tenant-1', 'o-44');

        expect(shipment).toBe(existingShipment);
        expect(shipmentRepository.insertShipment).not.toHaveBeenCalled();
        expect(shipmentEvents.emitShipmentCreated).not.toHaveBeenCalled();
    });

    it('should update tracking details and emit shipment_status_updated', async () => {
        const mockShipment = { id: 'ship-1', orderId: 'order-1', status: 'CREATED' };
        const mockOrder = { id: 'order-1', status: 'CONFIRMED', customerId: 'cust-1', conversationId: 'conv-1' };
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([mockOrder]),
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
        };
        
        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);
        vi.mocked(shipmentRepository.updateShipment).mockResolvedValue();
        vi.mocked(shipmentRepository.findShipmentById)
            .mockResolvedValueOnce(mockShipment as any)
            .mockResolvedValueOnce({ ...mockShipment, status: 'IN_TRANSIT' } as any);

        await shipmentService.updateShipmentStatus('tenant-1', 'ship-1', 'IN_TRANSIT', 'BR999', 'test.com');

        expect(shipmentRepository.updateShipment).toHaveBeenCalledWith(
            'tenant-1', 
            'ship-1', 
            expect.objectContaining({ status: 'IN_TRANSIT', trackingCode: 'BR999', trackingUrl: 'test.com' })
        );

        expect(shipmentEvents.emitShipmentStatusUpdated).toHaveBeenCalledWith(expect.objectContaining({
            orderId: 'order-1', shipmentId: 'ship-1', status: 'IN_TRANSIT'
        }));

        expect(mockDb.set).toHaveBeenCalledWith({ status: 'SHIPPED' });
        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'order_status_updated',
            payload: expect.objectContaining({
                orderId: 'order-1',
                status: 'SHIPPED',
                sourceShipmentStatus: 'IN_TRANSIT',
            })
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

    it('should reject regressive shipment transitions', async () => {
        vi.mocked(shipmentRepository.findShipmentById).mockResolvedValue({
            id: 'ship-1',
            orderId: 'order-1',
            status: 'IN_TRANSIT',
        } as any);

        await expect(
            shipmentService.updateShipmentStatus('tenant-1', 'ship-1', 'CREATED')
        ).rejects.toThrow('Cannot regress shipment status from IN_TRANSIT to CREATED');

        expect(shipmentRepository.updateShipment).not.toHaveBeenCalled();
    });

    it('should reject changes after shipment is delivered', async () => {
        vi.mocked(shipmentRepository.findShipmentById).mockResolvedValue({
            id: 'ship-1',
            orderId: 'order-1',
            status: 'DELIVERED',
        } as any);

        await expect(
            shipmentService.updateShipmentStatus('tenant-1', 'ship-1', 'IN_TRANSIT')
        ).rejects.toThrow('Cannot change status of a DELIVERED shipment');
    });
});
