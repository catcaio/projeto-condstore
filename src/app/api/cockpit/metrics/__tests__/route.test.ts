import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';
import { requireAdmin } from '@/infra/auth/guards';
import { messageRepository } from '@/infra/repositories/message.repository';
import { simulationRepository } from '@/infra/repositories/simulation.repository';
import { redisClient } from '@/infra/redis.client';
import { getDb } from '@/infra/db';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

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

vi.mock('@/infra/redis.client', () => ({
    redisClient: {
        isAvailable: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
    },
}));

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

describe('GET /api/cockpit/metrics', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            session: { tenantId: 'tenant-1' } as any,
        } as any);

        vi.mocked(redisClient.isAvailable).mockReturnValue(false);
        vi.mocked(redisClient.get).mockResolvedValue(null);
        vi.mocked(redisClient.set).mockResolvedValue(undefined as never);

        vi.mocked(messageRepository.getMetricsToday).mockResolvedValue({ total: 10 } as any);
        vi.mocked(simulationRepository.countToday).mockResolvedValue(5);

        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([{ count: 42 }]),
        };
        vi.mocked(getDb).mockResolvedValue(mockDb as any);
    });

    it('returns tenant-scoped metrics including DB queries for orders and errors', async () => {
        const request = {
            nextUrl: new URL('http://localhost/api/cockpit/metrics'),
            headers: new Headers(),
        } as never;

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json).toEqual(expect.objectContaining({
            mensagensHoje: 10,
            cotacoesHoje: 5,
            pedidosHoje: 42,
            erros24h: 42,
        }));
    });
});
