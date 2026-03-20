import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dbInfra from '@/infra/db';
import { shipmentRepository } from '../shipment.repository';

vi.mock('@/infra/db', async () => {
    const actual = await vi.importActual<typeof import('@/infra/db')>('@/infra/db');
    return {
        ...actual,
        getDb: vi.fn(),
    };
});

describe('shipmentRepository soft delete behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns shipment by order id from active records', async () => {
        const limit = vi.fn().mockResolvedValue([{ id: 'shipment-1', orderId: 'order-1' }]);
        const where = vi.fn().mockReturnValue({ limit });
        const from = vi.fn().mockReturnValue({ where });
        const select = vi.fn().mockReturnValue({ from });
        const mockDb = { select };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        const result = await shipmentRepository.findShipmentByOrderId('tenant-1', 'order-1');

        expect(result).toEqual({ id: 'shipment-1', orderId: 'order-1' });
        expect(where).toHaveBeenCalled();
    });

    it('soft deletes shipment via update instead of physical delete', async () => {
        const where = vi.fn().mockResolvedValue(undefined);
        const set = vi.fn().mockReturnValue({ where });
        const mockDb = {
            update: vi.fn().mockReturnValue({ set }),
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await shipmentRepository.softDeleteShipment('tenant-1', 'shipment-1');

        expect(set).toHaveBeenCalledWith(expect.objectContaining({
            deletedAt: expect.any(Date),
            updatedAt: expect.any(Date),
        }));
        expect(where).toHaveBeenCalled();
    });
});
