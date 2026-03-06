/**
 * benchmark-engine.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/metrics/cockpit-metrics-engine', () => ({
    getTenantCoreMetrics: vi.fn(),
}));
vi.mock('@/lib/supreme/benchmark-segmentation', () => ({
    getBenchmarkSegmentKey: vi.fn().mockResolvedValue('segment_general')
}));

// Mock db chains
function makeSelectChain(rows: any[]) {
    return {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        then: function (resolve: any) { resolve(rows); }
    };
}
function makeInsertChain() {
    return {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        then: function (resolve: any) { resolve([]); }
    };
}

import { getTenantCoreMetrics } from '@/lib/metrics/cockpit-metrics-engine';

describe('Benchmark Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getTenantCoreMetrics).mockReset(); // flush Once queues
    });

    describe('computeBenchmarks', () => {
        it('skips computing metrics if segment has less than 3 tenants (privacy rule)', async () => {
            const { getDb } = await import('@/infra/db');
            const { getTenantCoreMetrics } = await import('@/lib/metrics/cockpit-metrics-engine');

            const tenantRows = [{ id: 't1' }, { id: 't2' }]; // Only 2!
            const sel = makeSelectChain(tenantRows); // all tenants query
            const ins = makeInsertChain();

            sel.from = vi.fn().mockResolvedValue(tenantRows); // Break the chain appropriately

            vi.mocked(getDb).mockResolvedValue({ select: sel.select, from: sel.from, insert: ins.insert, values: ins.values, where: sel.where, limit: sel.limit } as any);

            vi.mocked(getTenantCoreMetrics).mockResolvedValue({
                conversion: { quote_to_order_rate: 0.10, checkout_completion_rate: 0.20, quotes_total: 10, checkout_started_total: 10, orders_total: 1 },
                retention: { repeat_orders_total: 5 },
                revenue: { payments_confirmed_total: 100 },
                operations: { messages_received_total: 50, avg_response_time_ms: 1000 }
            } as any);

            const { computeBenchmarks } = await import('@/lib/supreme/benchmark-engine');
            const saved = await computeBenchmarks(30);

            expect(saved).toBe(0); // None saved because size < 3
            expect(ins.insert).not.toHaveBeenCalled();
        });

        it('computes percentiles and persists if segment has 3 or more tenants', async () => {
            const { getDb } = await import('@/infra/db');
            const { getTenantCoreMetrics } = await import('@/lib/metrics/cockpit-metrics-engine');

            const tenantRows = [{ id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }];
            const sel = makeSelectChain(tenantRows);
            const ins = makeInsertChain();

            sel.from = vi.fn().mockResolvedValue(tenantRows);

            vi.mocked(getDb).mockResolvedValue({ select: sel.select, from: sel.from, insert: ins.insert, values: ins.values, where: sel.where, limit: sel.limit } as any);

            // Mock different conversion rates
            vi.mocked(getTenantCoreMetrics)
                .mockResolvedValueOnce({ conversion: { quote_to_order_rate: 0.10 }, retention: {}, revenue: {}, operations: {} } as any)
                .mockResolvedValueOnce({ conversion: { quote_to_order_rate: 0.12 }, retention: {}, revenue: {}, operations: {} } as any)
                .mockResolvedValueOnce({ conversion: { quote_to_order_rate: 0.15 }, retention: {}, revenue: {}, operations: {} } as any)
                .mockResolvedValue({ conversion: { quote_to_order_rate: 0.20 }, retention: {}, revenue: {}, operations: {} } as any);

            const { computeBenchmarks } = await import('@/lib/supreme/benchmark-engine');
            const saved = await computeBenchmarks(30);

            expect(saved).toBeGreaterThan(0);
            expect(ins.insert).toHaveBeenCalled();
            expect(ins.values).toHaveBeenCalledWith(expect.objectContaining({
                benchmarkMetric: 'quote_to_order_rate',
                sampleSize: 4
            }));
        });
    });

    describe('getTenantBenchmarks', () => {
        it('compares live tenant metric against fetched percentiles properly', async () => {
            const { getDb } = await import('@/infra/db');
            const { getTenantCoreMetrics } = await import('@/lib/metrics/cockpit-metrics-engine');

            // Db returns one metric benchmark row
            const rawRows = [{ benchmarkMetric: 'quote_to_order_rate', p25: 0.10, p50: 0.15, p75: 0.20, sampleSize: 100 }];
            const sel = makeSelectChain(rawRows);
            sel.limit.mockResolvedValueOnce(rawRows); // benchmarks lookup

            vi.mocked(getDb).mockResolvedValue({ select: sel.select, from: sel.from, where: sel.where, orderBy: sel.orderBy, limit: sel.limit } as any);

            // Tenant live metrics returns 0.05 (which is < p25)
            vi.mocked(getTenantCoreMetrics).mockResolvedValue({
                conversion: { quote_to_order_rate: 0.05, checkout_completion_rate: null },
                retention: { repeat_orders_total: null },
                revenue: { payments_confirmed_total: null },
                operations: { avg_response_time_ms: null }
            } as any);

            const { getTenantBenchmarks } = await import('@/lib/supreme/benchmark-engine');
            const res = await getTenantBenchmarks('mock-tenant-id');

            expect(res.metrics).toHaveLength(1);
            expect(res.metrics[0].metric).toBe('quote_to_order_rate');
            expect(res.metrics[0].tenantValue).toBe(0.05);
            expect(res.metrics[0].positionLabel).toBe('below_baseline'); // Because 0.05 < 0.10
        });
    });
});
