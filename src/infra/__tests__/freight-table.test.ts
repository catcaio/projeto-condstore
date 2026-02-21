import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { freightTableProvider } from '../freight-table';
import { redisClient } from '../redis.client';
import { logger } from '../logger';

// Mock dependencies
vi.mock('../redis.client', () => ({
    redisClient: {
        isAvailable: vi.fn().mockReturnValue(true),
        get: vi.fn(),
        set: vi.fn().mockResolvedValue(undefined),
        del: vi.fn().mockResolvedValue(undefined),
        ping: vi.fn().mockResolvedValue(true),
    }
}));

vi.mock('../logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    }
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FreightTableProvider', () => {
    const validCsv = `UF;CEP_INICIO;CEP_FIM;PESO_MAX;VALOR;PRAZO
SP;01000-000;05999-999;10.0;15,50;2
SP;06000-000;09999-999;10.0;18.20;3
RJ;20000-000;23999-999;5.0;25,00;4
`;

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear global cache to isolate tests
        (global as any)._freightTable = undefined;
        (global as any)._freightTableUpdatedAt = undefined;

        process.env.TABELA_CSV_URL = 'http://example.com/table.csv';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should fetch and parse valid CSV', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            text: () => Promise.resolve(validCsv)
        });

        // Ensure cache miss
        vi.mocked(redisClient.get).mockResolvedValue(null);
        // Force memory expiration
        const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01').getTime());

        const rule = await freightTableProvider.getFreight('SP', '01000000', 5);

        expect(rule).toEqual({
            cep_inicio: 1000000,
            cep_fim: 5999999,
            peso_max: 10,
            valor: 15.50,
            prazo: 2
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(redisClient.set).toHaveBeenCalled();

        dateSpy.mockRestore();
    });

    it('should return null if UF not found', async () => {
        vi.mocked(redisClient.get).mockResolvedValue(null);
        mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(validCsv) });
        vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-02').getTime());

        const rule = await freightTableProvider.getFreight('MG', '01000000', 5);
        expect(rule).toBeNull();
    });

    it('should return null if weight exceeds max', async () => {
        vi.mocked(redisClient.get).mockResolvedValue(null);
        mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(validCsv) });
        vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-03').getTime());

        const rule = await freightTableProvider.getFreight('RJ', '20000000', 10); // max is 5
        expect(rule).toBeNull();
    });

    it('should use Redis cache if available', async () => {
        const cachedTable = {
            'SP': [{ cep_inicio: 1, cep_fim: 99999999, peso_max: 100, valor: 10, prazo: 1 }]
        };
        vi.mocked(redisClient.get).mockResolvedValue(cachedTable);
        vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-04').getTime());

        const rule = await freightTableProvider.getFreight('SP', '12345678', 50);

        expect(rule).toEqual(cachedTable['SP'][0]);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use Memory cache if valid (L1)', async () => {
        // First call populates memory
        // We simulate this by relying on previous test state if parallel execution wasn't isolation
        // But vitest isolates.
        // We'll manually populate first.

        vi.mocked(redisClient.get).mockResolvedValue(null);
        mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(validCsv) });

        // Use a fixed time
        const start = 1700000000000;
        let now = start;
        const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);

        // Fetch 1
        await freightTableProvider.getFreight('SP', '01000000', 1);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Fetch 2 (immediate) - should invoke memory
        await freightTableProvider.getFreight('SP', '01000000', 1);
        expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1

        dateSpy.mockRestore();
    });

    it('should fallback to stale memory if fetch fails', async () => {
        // Populate memory first
        vi.mocked(redisClient.get).mockResolvedValue(null);
        mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(validCsv) });

        const start = 2000000000000;
        let now = start;
        const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);

        await freightTableProvider.getFreight('SP', '01000000', 1);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Advance time to expire memory
        now += (31 * 60 * 1000); // 31 mins

        // Mock fetch failure
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        // Try fetch
        const rule = await freightTableProvider.getFreight('SP', '01000000', 1);

        // Should return stale data
        expect(rule).not.toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Serving stale'));

        dateSpy.mockRestore();
    });

    it('should lookup by CEP using getFreightByCep when UF is unknown', async () => {
        vi.mocked(redisClient.get).mockResolvedValue(null);
        mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(validCsv) });
        vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-05').getTime());

        // '20000-000' is RJ in our mock CSV
        const rule = await freightTableProvider.getFreightByCep('20000000', 1);

        expect(rule).toEqual({
            cep_inicio: 20000000,
            cep_fim: 23999999,
            peso_max: 5.0,
            valor: 25.0,
            prazo: 4
        });
    });

    it('should return null if getFreightByCep finds nothing', async () => {
        vi.mocked(redisClient.get).mockResolvedValue(null);
        mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(validCsv) });
        vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-06').getTime());

        const rule = await freightTableProvider.getFreightByCep('99999999', 1);
        expect(rule).toBeNull();
    });
});

