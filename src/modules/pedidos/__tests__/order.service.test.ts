import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => {
    const limit = vi.fn();
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const transaction = vi.fn();

    return {
        limit,
        where,
        from,
        select,
        transaction,
    };
});

const structuredLoggerMocks = vi.hoisted(() => ({
    warn: vi.fn(),
}));

vi.mock('@/db/client', () => ({
    db: {
        select: dbMocks.select,
        transaction: dbMocks.transaction,
    },
}));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: structuredLoggerMocks,
}));

vi.mock('@/services/ecosystem-events.service', () => ({
    ecosystemEventsService: {
        emitEvent: vi.fn().mockResolvedValue(undefined),
    },
}));

import { createOrderFromSimulation } from '../order.service';

describe('createOrderFromSimulation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('blocks order creation when simulation is not ACCEPTED', async () => {
        dbMocks.limit.mockResolvedValueOnce([{ id: 'sim-1', status: 'DRAFT' }]);

        await expect(createOrderFromSimulation({
            tenantId: 'tenant-1',
            simulationId: 'sim-1',
            customerId: 'customer-1',
            organizationId: 'org-1',
            createdBy: 'user-1',
            items: [{ name: 'Produto', quantity: 1, unitPrice: 10 }],
        })).rejects.toThrow('Simulation sim-1 must be ACCEPTED to create an order (current: DRAFT)');

        expect(dbMocks.transaction).not.toHaveBeenCalled();
        expect(structuredLoggerMocks.warn).toHaveBeenCalledWith(
            'pedidos_create_order_from_simulation_blocked_status',
            expect.objectContaining({
                tenantId: 'tenant-1',
                simulationId: 'sim-1',
                simulationStatus: 'DRAFT',
            }),
        );
    });
});
