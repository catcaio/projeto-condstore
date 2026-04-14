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

vi.mock('@/infra/redis.client', () => ({
    redisClient: {
        setNx: vi.fn(),
        del: vi.fn().mockResolvedValue(true),
    },
}));

import { createOrderFromSimulation } from '../order.service';
import { redisClient } from '@/infra/redis.client';

describe('createOrderFromSimulation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(redisClient.setNx).mockResolvedValue(true);
    });

    it('blocks duplicate execution via Redis lock', async () => {
        vi.mocked(redisClient.setNx).mockResolvedValueOnce(false);

        await expect(createOrderFromSimulation({
            tenantId: 'tenant-1',
            simulationId: 'sim-1',
            customerId: 'customer-1',
            organizationId: 'org-1',
            createdBy: 'user-1',
            items: [{ name: 'Produto', quantity: 1, unitPrice: 10 }],
        })).rejects.toThrow('Order creation already in progress for simulation sim-1');

        expect(dbMocks.select).not.toHaveBeenCalled();
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
        })).rejects.toThrow('Simulation sim-1 must be ACCEPTED (current: DRAFT)');

        expect(dbMocks.transaction).not.toHaveBeenCalled();
    });

    it('blocks order creation when simulation is already CONVERTED', async () => {
        dbMocks.limit.mockResolvedValueOnce([{ id: 'sim-1', status: 'CONVERTED' }]);

        await expect(createOrderFromSimulation({
            tenantId: 'tenant-1',
            simulationId: 'sim-1',
            customerId: 'customer-1',
            organizationId: 'org-1',
            createdBy: 'user-1',
            items: [{ name: 'Produto', quantity: 1, unitPrice: 10 }],
        })).rejects.toThrow('Simulation sim-1 already converted to order');

        expect(dbMocks.transaction).not.toHaveBeenCalled();
    });
});
