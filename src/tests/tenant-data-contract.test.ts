/**
 * tenant-data-contract.test.ts
 * Tests for validateTenantDataContract() and the two internal API routes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/infra/auth/tenant-route-guard', () => ({
    requireInternalToken: vi.fn(),
}));

vi.mock('@/infra/http/request-trace', () => ({
    makeRequestId: vi.fn().mockReturnValue('test-req-id'),
    attachRequestIdHeader: vi.fn(),
    withRequestTrace: vi.fn((h: any) => h),
}));

vi.mock('@/infra/http/error-response', () => ({
    ErrorCode: {
        UNKNOWN: 'UNKNOWN',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        AUTH_REQUIRED: 'AUTH_REQUIRED',
        DB_ERROR: 'DB_ERROR',
        FORBIDDEN: 'FORBIDDEN',
    },
    errorResponse: vi.fn((code: string, status: number, _reqId: string, msg: string) =>
        new Response(JSON.stringify({ error: code, message: msg }), { status })
    ),
}));

vi.mock('@/lib/http/with-distributed-lock', () => ({
    withDistributedLock: vi.fn((_keyFn: any, _ttl: any, handler: any) => handler),
}));

vi.mock('@/lib/infra/lock-keys', () => ({
    jobLock: vi.fn((name: string) => `job:${name}`),
}));

// ── DB query builder mock ─────────────────────────────────────────────────────

function makeCountChain(n: number) {
    const chain: any = {
        select: vi.fn(() => chain),
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => Promise.resolve([{ id: 'x' }].slice(0, n > 0 ? 1 : 0))),
        then: (resolve: any) => resolve([{ cnt: n }]),
    };
    return chain;
}

function makeFullMockDb(counts: Record<string, number> = {}) {
    let callCount = 0;
    const tableCounts = [
        counts.acquisition ?? 0,
        counts.acquisitionFunnel ?? 0,
        counts.conversion ?? 0,
        counts.revenue ?? 0,
        counts.retention ?? 0,
        counts.tenantExists ?? 0,
        counts.users ?? 0,
    ];

    return {
        select: vi.fn(() => {
            const idx = callCount++;
            const n = tableCounts[idx] ?? 0;
            return makeCountChain(n);
        }),
        execute: vi.fn().mockResolvedValue([]),
    };
}

// ── validateTenantDataContract ────────────────────────────────────────────────

describe('validateTenantDataContract', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns all false when no data exists for tenant', async () => {
        const db = makeFullMockDb();
        const { validateTenantDataContract } = await import('@/lib/governance/tenant-data-contract');
        const result = await validateTenantDataContract('tenant-empty', db as any);

        expect(result.acquisition_ready).toBe(false);
        expect(result.conversion_ready).toBe(false);
        expect(result.revenue_ready).toBe(false);
        expect(result.retention_ready).toBe(false);
        expect(result.operational_ready).toBe(false);
    });

    it('returns acquisition_ready: true when attribution clicks with UTM exist', async () => {
        const db = makeFullMockDb({ acquisition: 5 });
        const { validateTenantDataContract } = await import('@/lib/governance/tenant-data-contract');
        const result = await validateTenantDataContract('tenant-acq', db as any);
        expect(result.acquisition_ready).toBe(true);
    });

    it('returns all true when all data is present', async () => {
        const db = makeFullMockDb({
            acquisition: 3,
            acquisitionFunnel: 2,
            conversion: 1,
            revenue: 1,
            retention: 5,
            tenantExists: 1,
            users: 2,
        });
        const { validateTenantDataContract } = await import('@/lib/governance/tenant-data-contract');
        const result = await validateTenantDataContract('tenant-full', db as any);

        expect(result.acquisition_ready).toBe(true);
        expect(result.conversion_ready).toBe(true);
        expect(result.revenue_ready).toBe(true);
        expect(result.retention_ready).toBe(true);
        expect(result.operational_ready).toBe(true);
        expect(result.tenantId).toBe('tenant-full');
        expect(result.checked_at).toBeTruthy();
    });
});

// ── GET /api/internal/tenants/:tenantId/data-contract-status ─────────────────

describe('GET /api/internal/tenants/:tenantId/data-contract-status', () => {
    beforeEach(() => vi.clearAllMocks());

    function makeRequest(tenantId = 'tenant-1') {
        return new NextRequest(
            `http://localhost/api/internal/tenants/${tenantId}/data-contract-status`,
            { method: 'GET' }
        );
    }

    it('returns 401 when not authenticated', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: false,
            code: 'AUTH_REQUIRED' as any,
            requestId: 'test-req-id',
            response: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }) as any,
        });

        const { GET } = await import(
            '@/app/api/internal/tenants/[tenantId]/data-contract-status/route'
        );
        const res = await GET(makeRequest(), { params: Promise.resolve({ tenantId: 'tenant-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 200 with readiness result when admin authenticated', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'test-req-id',
            session: { sub: 'admin', tenantId: 't1', role: 'admin', email: 'a@b.com', sv: 1 } as any,
        });

        const { getDb } = await import('@/infra/db');
        vi.mocked(getDb).mockResolvedValue(makeFullMockDb({ acquisition: 1, conversion: 1, revenue: 1, retention: 1, tenantExists: 1, users: 1 }) as any);

        const { GET } = await import(
            '@/app/api/internal/tenants/[tenantId]/data-contract-status/route'
        );
        const res = await GET(makeRequest(), { params: Promise.resolve({ tenantId: 'tenant-1' }) });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.data).toBeDefined();
        expect(body.data.tenantId).toBe('tenant-1');
    });
});

// ── POST /api/internal/jobs/data-contract-scan ────────────────────────────────

describe('POST /api/internal/jobs/data-contract-scan', () => {
    beforeEach(() => vi.clearAllMocks());

    function makeRequest() {
        return new NextRequest('http://localhost/api/internal/jobs/data-contract-scan', {
            method: 'POST',
        });
    }

    it('returns 401 when internal token missing', async () => {
        const { requireInternalToken } = await import('@/infra/auth/tenant-route-guard');
        vi.mocked(requireInternalToken).mockReturnValue({
            ok: false,
            response: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }) as any,
        });

        const { POST } = await import('@/app/api/internal/jobs/data-contract-scan/route');
        const res = await POST(makeRequest());
        expect(res.status).toBe(401);
    });

    it('returns 200 with scan summary when authenticated and tenants found', async () => {
        const { requireInternalToken } = await import('@/infra/auth/tenant-route-guard');
        vi.mocked(requireInternalToken).mockReturnValue({ ok: true });

        const { getDb } = await import('@/infra/db');
        // First call returns tenant list; subsequent calls return data contract queries
        let dbCallCount = 0;
        const mockDb = {
            select: vi.fn(() => {
                const chain: any = {
                    from: vi.fn(() => chain),
                    where: vi.fn(() => chain),
                    limit: vi.fn(() => Promise.resolve([{ id: 'x' }])),
                    then: (resolve: any) => {
                        if (dbCallCount === 0) {
                            dbCallCount++;
                            return resolve([{ id: 'tenant-1' }]); // tenants list
                        }
                        dbCallCount++;
                        return resolve([{ cnt: 1 }]); // all checks pass
                    },
                };
                return chain;
            }),
            execute: vi.fn().mockResolvedValue([]),
        };
        vi.mocked(getDb).mockResolvedValue(mockDb as any);

        const { POST } = await import('@/app/api/internal/jobs/data-contract-scan/route');
        const res = await POST(makeRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.data.tenants_scanned).toBe(1);
    });
});
