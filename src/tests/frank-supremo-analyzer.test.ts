/**
 * frank-supremo-analyzer.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Shared mocks ──────────────────────────────────────────────────────────────

vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/actions/action-engine', () => ({
    proposeAction: vi.fn().mockResolvedValue({ id: 'action-123' }),
}));
vi.mock('@/lib/metrics/cockpit-metrics-engine', () => ({
    getTenantCoreMetrics: vi.fn(),
}));

// Mock action-types purely for string validation in proposeAction
vi.mock('@/lib/actions/action-types', () => ({
    ActionScope: {},
    ACTION_TYPE_TO_SCOPE: {
        adjust_quote_margin: 'FREIGHT',
        adjust_checkout_incentive: 'PRICING',
        trigger_reactivation_sequence: 'CRM',
        update_auto_reply_flow: 'WHATSAPP',
        adjust_campaign_budget: 'ADS',
    },
}));

function makeInsertChain() { return { insert: vi.fn().mockReturnThis(), values: vi.fn().mockResolvedValue([]) }; }
function makeSelectChain(rows: any[]) { return { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(rows), orderBy: vi.fn().mockReturnThis() }; }
function makeUpdateChain() { return { update: vi.fn().mockReturnThis(), set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) }; }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FRANK SUPREMO Analyzer', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    describe('analyzeTenant thresholds', () => {
        it('creates low_quote_to_order_rate finding when Q2O is poor', async () => {
            const { getDb } = await import('@/infra/db');
            const { getTenantCoreMetrics } = await import('@/lib/metrics/cockpit-metrics-engine');

            // Setup metrics mock
            vi.mocked(getTenantCoreMetrics).mockResolvedValue({
                acquisition: { leads_total: 0, attributed_traffic_total: 0 },
                conversion: { quotes_total: 20, checkout_started_total: 0, checkout_completed_total: 0, orders_total: 2, quote_to_order_rate: 0.10, checkout_completion_rate: 0 },
                operations: { messages_received_total: 0 },
                revenue: { payments_confirmed_total: 0, gross_revenue_total: 0 },
                retention: { repeat_orders_total: 0, reactivated_customers_total: 0 },
            } as any);

            const sel = makeSelectChain([]); // empty so it thinks no duplicate exists
            const ins = makeInsertChain();
            vi.mocked(getDb).mockResolvedValue({ select: sel.select, from: sel.from, where: sel.where, limit: sel.limit, insert: ins.insert, values: ins.values } as any);

            const { analyzeTenant } = await import('@/lib/supreme/frank-supremo-analyzer');
            const res = await analyzeTenant('tenant-1', 30);

            expect(res.findingsGenerated).toBeGreaterThan(0);
            const insertedVals = ins.values.mock.calls[0][0];
            expect(insertedVals.findingType).toBe('low_quote_to_order_rate');
            expect(insertedVals.severity).toBe('MEDIUM');
        });

        it('creates checkout_dropoff_high finding when checkout completion is poor', async () => {
            const { getDb } = await import('@/infra/db');
            const { getTenantCoreMetrics } = await import('@/lib/metrics/cockpit-metrics-engine');

            vi.mocked(getTenantCoreMetrics).mockResolvedValue({
                acquisition: { leads_total: 0, attributed_traffic_total: 0 },
                conversion: { quotes_total: 0, checkout_started_total: 50, checkout_completed_total: 10, orders_total: 10, quote_to_order_rate: 0, checkout_completion_rate: 0.20 },
                operations: { messages_received_total: 0 },
                revenue: { payments_confirmed_total: 0, gross_revenue_total: 0 },
                retention: { repeat_orders_total: 0, reactivated_customers_total: 0 },
            } as any);

            const sel = makeSelectChain([]);
            const ins = makeInsertChain();
            vi.mocked(getDb).mockResolvedValue({ select: sel.select, from: sel.from, limit: sel.limit, where: sel.where, insert: ins.insert, values: ins.values } as any);

            const { analyzeTenant } = await import('@/lib/supreme/frank-supremo-analyzer');
            const res = await analyzeTenant('tenant-1', 30);

            expect(res.findingsGenerated).toBeGreaterThan(0);
            const insertedVals = ins.values.mock.calls[0][0];
            expect(insertedVals.findingType).toBe('checkout_dropoff_high');
            expect(insertedVals.severity).toBe('HIGH');
        });

        it('gracefully degrades and avoids throwing when prev-period metrics fail', async () => {
            const { getDb } = await import('@/infra/db');
            const { getTenantCoreMetrics } = await import('@/lib/metrics/cockpit-metrics-engine');

            // The first call returns good metrics. 
            // The second call (prev window) throws.
            vi.mocked(getTenantCoreMetrics)
                .mockResolvedValueOnce({
                    acquisition: { leads_total: 0, attributed_traffic_total: 0 },
                    conversion: { quotes_total: 0, checkout_started_total: 0, checkout_completed_total: 0, orders_total: 0, quote_to_order_rate: 0, checkout_completion_rate: 0 },
                    operations: { messages_received_total: 0 },
                    revenue: { payments_confirmed_total: 0, gross_revenue_total: 0 },
                    retention: { repeat_orders_total: 0, reactivated_customers_total: 0 },
                } as any)
                .mockRejectedValueOnce(new Error('Timeout DB'));

            const sel = makeSelectChain([]);
            const ins = makeInsertChain();
            vi.mocked(getDb).mockResolvedValue({ select: sel.select, from: sel.from, limit: sel.limit, where: sel.where, insert: ins.insert, values: ins.values } as any);

            const { analyzeTenant } = await import('@/lib/supreme/frank-supremo-analyzer');
            const res = await analyzeTenant('tenant-1', 30);

            // Should handle the rejection gracefully and just report 0 findings since we didn't trigger any thresholds
            expect(res.findingsGenerated).toBe(0);
            const { structuredLogger } = await import('@/infra/log/logger');
            expect(structuredLogger.warn).toHaveBeenCalledWith('supreme_analyzer_metrics_degraded', expect.any(Object));
        });
    });

    describe('resolveFinding', () => {
        it('updates status to RESOLVED', async () => {
            const { getDb } = await import('@/infra/db');
            const sel = makeSelectChain([{ id: 'fnd-1' }]);
            const upd = makeUpdateChain();
            vi.mocked(getDb).mockResolvedValue({ select: sel.select, from: sel.from, limit: sel.limit, where: sel.where, update: upd.update, set: upd.set } as any);

            const { resolveFinding } = await import('@/lib/supreme/frank-supremo-analyzer');
            const res = await resolveFinding('tenant-1', 'fnd-1');

            expect(res.status).toBe('RESOLVED');
            expect(upd.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'RESOLVED' }));
        });
    });

    describe('proposeRecommendedAction', () => {
        it('calls proposeAction with correctly mapped scope and updates status', async () => {
            const { getDb } = await import('@/infra/db');
            const sel = makeSelectChain([{
                id: 'fnd-2',
                tenantId: 'tenant-1',
                status: 'OPEN',
                recommendedActionType: 'adjust_checkout_incentive',
                recommendedActionPayload: { incentive: 'free_shipping_unlock' }
            }]);
            const upd = makeUpdateChain();
            vi.mocked(getDb).mockResolvedValue({ select: sel.select, from: sel.from, limit: sel.limit, where: sel.where, update: upd.update, set: upd.set } as any);

            const { proposeAction } = await import('@/lib/actions/action-engine');
            const { proposeRecommendedAction } = await import('@/lib/supreme/frank-supremo-analyzer');

            const res = await proposeRecommendedAction('tenant-1', 'fnd-2', 'admin');

            expect(proposeAction).toHaveBeenCalledWith(expect.objectContaining({
                tenantId: 'tenant-1',
                actionType: 'adjust_checkout_incentive',
                actionScope: 'PRICING', // Mapped securely from ACTION_TYPE_TO_SCOPE inside service
                payload: expect.objectContaining({
                    incentive: 'free_shipping_unlock',
                    _sourceFindingId: 'fnd-2'
                })
            }));
            expect(upd.set).toHaveBeenCalledWith({ status: 'ACTION_PROPOSED' });
            expect(res.findingStatus).toBe('ACTION_PROPOSED');
        });

        it('rejects if finding is already resolved', async () => {
            const { getDb } = await import('@/infra/db');
            const sel = makeSelectChain([{ id: 'fnd-3', status: 'RESOLVED', recommendedActionType: 'adjust_quote_margin' }]);
            vi.mocked(getDb).mockResolvedValue({ select: sel.select, from: sel.from, limit: sel.limit, where: sel.where } as any);

            const { proposeRecommendedAction } = await import('@/lib/supreme/frank-supremo-analyzer');
            await expect(proposeRecommendedAction('tenant-1', 'fnd-3', 'admin')).rejects.toThrow('Cannot propose action for finding in status RESOLVED');
        });
    });
});
