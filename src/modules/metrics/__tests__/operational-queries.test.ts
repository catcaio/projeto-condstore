import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOperationalMetrics } from '../queries/operational-queries';
import { getDb } from '@/infra/db';
import { messageRepository } from '@/infra/repositories/message.repository';
import { simulationRepository } from '@/infra/repositories/simulation.repository';

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
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

vi.mock('@/infra/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

const PINNED_NOW = new Date('2026-09-20T15:30:00.000Z');

function mockDbWith(selectRows: unknown[][], timingsRow: unknown = { avgFirstResponseSec: null, avgFirstQuoteSec: null }) {
    const select = vi.fn();
    for (const rows of selectRows) {
        select.mockImplementationOnce(() => ({
            from: () => ({
                where: () => Promise.resolve(rows),
            }),
        }));
    }
    const execute = vi.fn().mockResolvedValue([timingsRow]);
    vi.mocked(getDb).mockResolvedValue({ select, execute } as never);
}

describe('getOperationalMetrics — conversão por coorte (issue #396)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(messageRepository.getMetricsToday).mockResolvedValue({ total: 0, breakdown: {} } as never);
        vi.mocked(simulationRepository.countToday).mockResolvedValue(0);
    });

    it('rejeita tenantId vazio', async () => {
        await expect(getOperationalMetrics('', null, PINNED_NOW)).rejects.toThrow();
    });

    it('conversão = CONVERTED da coorte / total da coorte (40%)', async () => {
        // ordem de selects: pedidos, erros, handoffs, conversão
        mockDbWith([[{ count: 7 }], [{ count: 1 }], [{ count: 2 }], [{ total: 5, converted: 2 }]]);

        const result = await getOperationalMetrics('tenant-1', null, PINNED_NOW);

        expect(result.pedidosHoje).toBe(7);
        expect(result.erros24h).toBe(1);
        expect(result.handoffsHoje).toBe(2);
        expect(result.conversaoCotacaoPedido).toBe(40);
    });

    it('conversão limitada a 100% quando toda a coorte converteu', async () => {
        mockDbWith([[{ count: 3 }], [{ count: 0 }], [{ count: 0 }], [{ total: 4, converted: 4 }]]);

        const result = await getOperationalMetrics('tenant-1', null, PINNED_NOW);

        expect(result.conversaoCotacaoPedido).toBe(100);
    });

    it('conversão = 0 sem cotações na coorte (sem divisão por zero)', async () => {
        mockDbWith([[{ count: 9 }], [{ count: 0 }], [{ count: 0 }], [{ total: 0, converted: 0 }]]);

        const result = await getOperationalMetrics('tenant-1', null, PINNED_NOW);

        // 9 pedidos órfãos (sem cotação) NÃO inflacionam a conversão
        expect(result.pedidosHoje).toBe(9);
        expect(result.conversaoCotacaoPedido).toBe(0);
    });
});
