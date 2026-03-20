import { beforeEach, describe, expect, it, vi } from 'vitest';

const limit = vi.fn();
const where = vi.fn().mockReturnValue({ limit });
const from = vi.fn().mockReturnValue({ where });
const select = vi.fn().mockReturnValue({ from });

vi.mock('@/db/client', () => ({
    db: {
        select,
    },
}));

import { findFreightShipmentByExternalShipmentId } from '../shipment-linkage.repository';

describe('shipment linkage repository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('finds webhook shipments by provider shipment id', async () => {
        limit.mockResolvedValueOnce([{ id: 'shipment-1', externalShipmentId: 'me-order-1' }]);

        const result = await findFreightShipmentByExternalShipmentId('me-order-1', 'TRK123');

        expect(result).toEqual({ id: 'shipment-1', externalShipmentId: 'me-order-1' });
        expect(select).toHaveBeenCalled();
        expect(where).toHaveBeenCalled();
        expect(limit).toHaveBeenCalledWith(1);
    });

    it('returns null when no shipment matches the external id', async () => {
        limit.mockResolvedValueOnce([]);

        const result = await findFreightShipmentByExternalShipmentId('missing-order-id');

        expect(result).toBeNull();
    });
});
