import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { requireInternalAuth } from '@/infra/auth/require-internal-auth';
import { redisClient } from '@/infra/redis.client';
import { createOrderFromSimulation } from '@/modules/pedidos/server';

vi.mock('@/infra/auth/require-internal-auth', () => ({
    requireInternalAuth: vi.fn(),
}));

vi.mock('@/infra/redis.client', () => ({
    redisClient: {
        setNx: vi.fn(),
    }
}));

vi.mock('@/modules/pedidos/server', () => ({
    createOrderFromSimulation: vi.fn(),
}));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

const MOCK_SIM_ID = '123e4567-e89b-12d3-a456-426614174000';
const MOCK_CUST_ID = '123e4567-e89b-12d3-a456-426614174001';
const MOCK_ORG_ID = '123e4567-e89b-12d3-a456-426614174002';

describe('POST /api/orders/create-from-quote', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create order when lock is acquired', async () => {
        vi.mocked(requireInternalAuth).mockResolvedValue({ ok: true, tenantId: 'tenant-123' } as any);
        vi.mocked(redisClient.setNx).mockResolvedValue(true);
        vi.mocked(createOrderFromSimulation).mockResolvedValue({ id: 'order-123' } as any);

        const req = new NextRequest('http://localhost/api/orders/create-from-quote', {
            method: 'POST',
            body: JSON.stringify({
                simulationId: MOCK_SIM_ID,
                customerId: MOCK_CUST_ID,
                organizationId: MOCK_ORG_ID,
                items: [{ name: 'Item', quantity: 1, unitPrice: 100 }]
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(201);
        expect(redisClient.setNx).toHaveBeenCalledWith(`lock:order:simulation:${MOCK_SIM_ID}`, '1', 60);
        expect(createOrderFromSimulation).toHaveBeenCalled();
    });

    it('should return 409 when lock is already held', async () => {
        vi.mocked(requireInternalAuth).mockResolvedValue({ ok: true, tenantId: 'tenant-123' } as any);
        vi.mocked(redisClient.setNx).mockResolvedValue(false);

        const req = new NextRequest('http://localhost/api/orders/create-from-quote', {
            method: 'POST',
            body: JSON.stringify({
                simulationId: MOCK_SIM_ID,
                customerId: MOCK_CUST_ID,
                organizationId: MOCK_ORG_ID,
                items: [{ name: 'Item', quantity: 1, unitPrice: 100 }]
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.error).toMatch(/already in progress/);
        expect(createOrderFromSimulation).not.toHaveBeenCalled();
    });
});
