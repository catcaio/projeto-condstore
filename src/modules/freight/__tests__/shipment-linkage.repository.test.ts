import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => {
    const limit = vi.fn();
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });

    return { limit, where, from, select };
});

vi.mock('@/db/client', () => ({
    db: {
        select: dbMocks.select,
    },
}));

import { findFreightShipmentByExternalShipmentId } from '../shipment-linkage.repository';

describe('shipment linkage repository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('finds webhook shipments by provider shipment id', async () => {
        dbMocks.limit.mockResolvedValueOnce([{ id: 'shipment-1', externalShipmentId: 'me-order-1' }]);

        const result = await findFreightShipmentByExternalShipmentId('me-order-1', 'TRK123');

        expect(result).toEqual({ id: 'shipment-1', externalShipmentId: 'me-order-1' });
        expect(dbMocks.select).toHaveBeenCalled();
        expect(dbMocks.where).toHaveBeenCalled();
        expect(dbMocks.limit).toHaveBeenCalledWith(1);
    });

    it('returns null when no shipment matches the external id', async () => {
        dbMocks.limit.mockResolvedValueOnce([]);

        const result = await findFreightShipmentByExternalShipmentId('missing-order-id');

        expect(result).toBeNull();
    });
});
