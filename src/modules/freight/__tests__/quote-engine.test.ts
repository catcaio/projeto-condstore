import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@/infra/errors';

const mockLoadOperationalSettings = vi.fn();
const mockCalculateShipping = vi.fn();
const mockGetTableAdaptersForDestination = vi.fn();
const mockSelectCarrierStrategy = vi.fn();
const mockConcurrentRun = vi.fn(async ({ adapters, input }: any) => {
    for (const adapter of adapters) {
        await adapter.getQuotes(input);
    }

    return { quotes: [] };
});

vi.mock('@/core/freight/operational-settings', () => ({
    loadOperationalSettings: (...args: any[]) => mockLoadOperationalSettings(...args),
}));

vi.mock('@/providers/melhorenvio.provider', () => ({
    melhorEnvioProvider: {
        calculateShipping: (...args: any[]) => mockCalculateShipping(...args),
    },
}));

vi.mock('@/modules/freight/table-driven-adapter', () => ({
    getTableAdaptersForDestination: (...args: any[]) => mockGetTableAdaptersForDestination(...args),
}));

vi.mock('@/modules/freight/carrier-router', () => ({
    selectCarrierStrategy: (...args: any[]) => mockSelectCarrierStrategy(...args),
}));

vi.mock('@/modules/shipping/quote-engine/ConcurrentQuoteEngine', () => ({
    ConcurrentQuoteEngine: {
        run: (...args: any[]) => mockConcurrentRun(...args),
    },
}));

vi.mock('@/infra/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        http: vi.fn(),
    },
}));

import { UnifiedQuoteEngine } from '../quote-engine';

function makeSettings(overrides: Partial<Awaited<ReturnType<typeof mockLoadOperationalSettings>>> = {}) {
    return {
        maxIdenticalPerVolume: 3,
        stackingIncrementCm: 10,
        maxVolumeLengthCm: 300,
        maxVolumeWidthCm: 200,
        maxVolumeHeightCm: 200,
        absorbSmallerItems: true,
        absorbWeightOnly: true,
        defaultOriginCep: '',
        defaultCubageFactor: 300,
        defaultUnitWeightKg: 0.3,
        maxFreightOptions: 3,
        ruleVersion: 0,
        ...overrides,
    };
}

describe('UnifiedQuoteEngine', () => {
    beforeEach(() => {
        mockLoadOperationalSettings.mockReset();
        mockCalculateShipping.mockReset();
        mockGetTableAdaptersForDestination.mockReset();
        mockSelectCarrierStrategy.mockReset();
        mockConcurrentRun.mockClear();

        mockCalculateShipping.mockResolvedValue([]);
        mockGetTableAdaptersForDestination.mockResolvedValue([]);
        mockSelectCarrierStrategy.mockReturnValue({ strategy: 'melhor_envio' });
    });

    it('fails explicitly when originCep is absent', async () => {
        mockLoadOperationalSettings.mockResolvedValueOnce(makeSettings({ defaultOriginCep: '' }));

        const engine = new UnifiedQuoteEngine();

        await expect(
            engine.getQuotes({
                tenantId: 'TENANT_NO_ORIGIN',
                destinationCep: '88000000',
                quantity: 1,
                dimensions: { width: 10, height: 10, length: 10 },
            }),
        ).rejects.toMatchObject({
            code: ErrorCode.VALIDATION_ERROR,
            message: 'originCep is required for tenant TENANT_NO_ORIGIN',
        });
    });

    it('passes tenant-scoped originCep downstream when configured', async () => {
        mockLoadOperationalSettings.mockResolvedValueOnce(makeSettings({ defaultOriginCep: '12345678' }));

        const engine = new UnifiedQuoteEngine();
        await engine.getQuotes({
            tenantId: 'TENANT_WITH_ORIGIN',
            destinationCep: '88000000',
            quantity: 1,
            dimensions: { width: 10, height: 10, length: 10 },
        });

        expect(mockCalculateShipping).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'TENANT_WITH_ORIGIN',
            originCep: '12345678',
        }));
    });
});
