import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { messageRepository } from '@/infra/repositories/message.repository';
import { simulationRepository } from '@/infra/repositories/simulation.repository';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { redisClient } from '@/infra/redis.client';

vi.mock('@/infra/repositories/message.repository', () => ({
    messageRepository: {
        getMetricsToday: vi.fn(),
    },
}));

vi.mock('@/infra/repositories/simulation.repository', () => ({
    simulationRepository: {
        countToday: vi.fn(),
    },
}));

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/infra/redis.client', () => ({
    redisClient: {
        isAvailable: vi.fn().mockReturnValue(false),
        get: vi.fn(),
        set: vi.fn(),
    },
}));

describe('GET /api/cockpit/metrics', () => {
    const tenantId = 'test-tenant-id';

    beforeEach(() => {
        vi.clearAllMocks();
        (requireAdmin as any).mockResolvedValue({
            ok: true,
            session: { tenantId },
            requestId: 'test-request-id',
        });
    });

    it('should return all operational metrics successfully', async () => {
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn(),
        };

        (getDb as any).mockResolvedValue(mockDb);

        // Mock messageRepository.getMetricsToday
        (messageRepository.getMetricsToday as any).mockResolvedValue({ total: 100 });
        // Mock simulationRepository.countToday
        (simulationRepository.countToday as any).mockResolvedValue(50);

        // Mock various select calls
        // 1. pedidosHoje
        // 2. erros24h
        // 3. handoffsHoje
        // 4. conversion (simulations)
        // 5. conversion (orders)
        mockDb.select.mockImplementation(() => {
            return {
                from: () => ({
                    where: () => Promise.resolve([{ count: 10 }]),
                }),
            } as any;
        });

        // Mock timingsResult execute call
        mockDb.execute.mockResolvedValueOnce([
            [{ avgFirstResponseSec: 120, avgFirstQuoteSec: 300 }]
        ]);

        const request = new NextRequest('http://localhost/api/cockpit/metrics');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
            mensagensHoje: 100,
            cotacoesHoje: 50,
            pedidosHoje: 10,
            erros24h: 10,
            tempoMedioRespostaMin: 2, // 120s / 60
            tempoMedioCotacaoMin: 5, // 300s / 60
            handoffsHoje: 10,
            conversaoCotacaoPedido: 100, // (10 orders / 10 simulations) * 100 = 100
        });
    });

    it('should handle null values for timings', async () => {
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: vi.fn(),
        };

        (getDb as any).mockResolvedValue(mockDb);

        (messageRepository.getMetricsToday as any).mockResolvedValue({ total: 100 });
        (simulationRepository.countToday as any).mockResolvedValue(50);

        mockDb.select.mockImplementation(() => {
            return {
                from: () => ({
                    where: () => Promise.resolve([{ count: 0 }]),
                }),
            } as any;
        });

        // Mock timingsResult execute call with nulls
        mockDb.execute.mockResolvedValueOnce([
            [{ avgFirstResponseSec: null, avgFirstQuoteSec: null }]
        ]);

        const request = new NextRequest('http://localhost/api/cockpit/metrics');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.tempoMedioRespostaMin).toBeNull();
        expect(data.tempoMedioCotacaoMin).toBeNull();
        expect(data.conversaoCotacaoPedido).toBe(0);
    });
});
