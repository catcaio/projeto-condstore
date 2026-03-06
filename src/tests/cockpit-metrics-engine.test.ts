/**
 * cockpit-metrics-engine.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/infra/auth/guards', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/infra/http/request-trace', () => ({ makeRequestId: vi.fn().mockReturnValue('req-test') }));
vi.mock('@/infra/http/error-response', () => ({
    ErrorCode: { UNKNOWN: 'UNKNOWN', VALIDATION_ERROR: 'VALIDATION_ERROR', AUTH_REQUIRED: 'AUTH_REQUIRED' },
    errorResponse: vi.fn((code: string, status: number, _id: string, msg: string) =>
        new Response(JSON.stringify({ error: code, message: msg }), { status })
    ),
}));

// ── DB mock factory ───────────────────────────────────────────────────────────

function makeCountDb(returnValue: number) {
    const chain: any = {
        select: vi.fn(() => chain),
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        // Drizzle's .select({ total: count() }).from().where() returns a Promise of rows
        then: (resolve: any) => resolve([{ total: returnValue }]),
    };
    return { getDb: () => Promise.resolve(chain) };
}

// ── getTenantCoreMetrics unit tests ───────────────────────────────────────────

describe('getTenantCoreMetrics', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns all-zero metrics for a tenant with no events', async () => {
        const { getDb } = await import('@/infra/db');
        const chain: any = {
            select: vi.fn(() => chain),
            from: vi.fn(() => chain),
            where: vi.fn().mockResolvedValue([{ total: 0 }]),
        };
        vi.mocked(getDb).mockResolvedValue(chain as any);

        const { getTenantCoreMetrics } = await import('@/lib/metrics/cockpit-metrics-engine');
        const result = await getTenantCoreMetrics('tenant-empty', {
            from: new Date('2026-01-01'),
            to: new Date('2026-01-31'),
        });

        expect(result.acquisition.leads_total).toBe(0);
        expect(result.conversion.quotes_total).toBe(0);
        expect(result.conversion.quote_to_order_rate).toBe(0);
        expect(result.retention.repeat_orders_total).toBe(0);
    });

    it('calculates safe rates without divide-by-zero', async () => {
        // quotes=0, orders=0 → quote_to_order_rate should be 0, not NaN/Infinity
        const { getDb } = await import('@/infra/db');
        const chain: any = {
            select: vi.fn(() => chain),
            from: vi.fn(() => chain),
            where: vi.fn().mockResolvedValue([{ total: 0 }]),
        };
        vi.mocked(getDb).mockResolvedValue(chain as any);

        const { getTenantCoreMetrics } = await import('@/lib/metrics/cockpit-metrics-engine');
        const result = await getTenantCoreMetrics('tenant-1', {
            from: new Date('2026-01-01'),
            to: new Date('2026-02-01'),
        });

        expect(result.conversion.quote_to_order_rate).toBe(0);
        expect(result.conversion.checkout_completion_rate).toBe(0);
        expect(Number.isFinite(result.conversion.quote_to_order_rate)).toBe(true);
    });

    it('groups all 5 domains in a single response', async () => {
        const { getDb } = await import('@/infra/db');
        const chain: any = {
            select: vi.fn(() => chain),
            from: vi.fn(() => chain),
            where: vi.fn().mockResolvedValue([{ total: 5 }]),
        };
        vi.mocked(getDb).mockResolvedValue(chain as any);

        const { getTenantCoreMetrics } = await import('@/lib/metrics/cockpit-metrics-engine');
        const result = await getTenantCoreMetrics('tenant-1', {
            from: new Date('2026-01-01'),
            to: new Date('2026-02-01'),
        });

        expect(result).toHaveProperty('acquisition');
        expect(result).toHaveProperty('conversion');
        expect(result).toHaveProperty('operations');
        expect(result).toHaveProperty('revenue');
        expect(result).toHaveProperty('retention');
        expect(result.acquisition.leads_total).toBe(5);
        expect(result.revenue.payments_confirmed_total).toBe(5);
    });

    it('respects date range boundaries in the response', async () => {
        const { getDb } = await import('@/infra/db');
        const chain: any = {
            select: vi.fn(() => chain),
            from: vi.fn(() => chain),
            where: vi.fn().mockResolvedValue([{ total: 0 }]),
        };
        vi.mocked(getDb).mockResolvedValue(chain as any);

        const from = new Date('2026-03-01');
        const to = new Date('2026-03-06');

        const { getTenantCoreMetrics } = await import('@/lib/metrics/cockpit-metrics-engine');
        const result = await getTenantCoreMetrics('tenant-1', { from, to });

        expect(result.range.from).toBe(from.toISOString());
        expect(result.range.to).toBe(to.toISOString());
    });
});

// ── GET /api/internal/tenants/:tenantId/metrics/core ─────────────────────────

describe('GET /api/internal/tenants/:tenantId/metrics/core', () => {
    beforeEach(() => vi.clearAllMocks());

    function makeRequest(tenantId = 'tenant-1', qs = '') {
        return new NextRequest(
            `http://localhost/api/internal/tenants/${tenantId}/metrics/core${qs}`,
            { method: 'GET' }
        );
    }

    it('returns 401 when not authenticated', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: false,
            code: 'AUTH_REQUIRED' as any,
            requestId: 'req-test',
            response: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }) as any,
        });

        const { GET } = await import('@/app/api/internal/tenants/[tenantId]/metrics/core/route');
        const res = await GET(makeRequest(), { params: Promise.resolve({ tenantId: 'tenant-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 400 when from > to', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true, requestId: 'req-test',
            session: { sub: 'admin', tenantId: 't', role: 'admin', email: 'a@b.com', sv: 1 } as any,
        });

        const { GET } = await import('@/app/api/internal/tenants/[tenantId]/metrics/core/route');
        const res = await GET(
            makeRequest('tenant-1', '?from=2026-03-10&to=2026-03-01'),
            { params: Promise.resolve({ tenantId: 'tenant-1' }) }
        );
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toMatch(/before/);
    });

    it('returns 200 with all 5 domains present', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true, requestId: 'req-test',
            session: { sub: 'admin', tenantId: 't', role: 'admin', email: 'a@b.com', sv: 1 } as any,
        });

        const { getDb } = await import('@/infra/db');
        const chain: any = {
            select: vi.fn(() => chain),
            from: vi.fn(() => chain),
            where: vi.fn().mockResolvedValue([{ total: 0 }]),
        };
        vi.mocked(getDb).mockResolvedValue(chain as any);

        const { GET } = await import('@/app/api/internal/tenants/[tenantId]/metrics/core/route');
        const res = await GET(
            makeRequest('tenant-1', '?from=2026-01-01&to=2026-03-01'),
            { params: Promise.resolve({ tenantId: 'tenant-1' }) }
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.data).toHaveProperty('acquisition');
        expect(body.data).toHaveProperty('conversion');
        expect(body.data).toHaveProperty('operations');
        expect(body.data).toHaveProperty('revenue');
        expect(body.data).toHaveProperty('retention');
    });
});
