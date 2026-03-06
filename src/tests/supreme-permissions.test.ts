/**
 * supreme-permissions.test.ts
 * Tests for the supreme permissions repository, service, and API endpoints.
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

vi.mock('@/infra/http/request-trace', () => ({
    makeRequestId: vi.fn().mockReturnValue('req-test'),
    attachRequestIdHeader: vi.fn(),
}));

vi.mock('@/infra/http/error-response', () => ({
    ErrorCode: {
        UNKNOWN: 'UNKNOWN',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        AUTH_REQUIRED: 'AUTH_REQUIRED',
        FORBIDDEN: 'FORBIDDEN',
    },
    errorResponse: vi.fn((code: string, status: number, _id: string, msg: string) =>
        new Response(JSON.stringify({ error: code, message: msg }), { status })
    ),
}));

vi.mock('@/infra/repositories/tenant-supreme-permissions.repository', () => ({
    tenantSupremePermissionsRepository: {
        getTenantSupremePermissions: vi.fn(),
        updateTenantSupremePermissions: vi.fn(),
    },
}));

// ── Default permissions ───────────────────────────────────────────────────────

const DEFAULTS = {
    tenantId: 'tenant-1',
    allowReadMetrics: true,
    allowGenerateRecommendations: true,
    allowExecuteOptimizations: false,
    allowAdsBudgetChanges: false,
    allowCrmActions: false,
    allowWhatsappAutomation: true,
    updatedAt: new Date('2026-03-06T00:00:00Z'),
};

// ── assertSupremePermission ───────────────────────────────────────────────────

describe('assertSupremePermission', () => {
    beforeEach(() => vi.clearAllMocks());

    it('does not throw for READ_METRICS when allowed by default', async () => {
        const { tenantSupremePermissionsRepository } = await import(
            '@/infra/repositories/tenant-supreme-permissions.repository'
        );
        vi.mocked(tenantSupremePermissionsRepository.getTenantSupremePermissions).mockResolvedValue(DEFAULTS);

        const { assertSupremePermission } = await import('@/lib/governance/supreme-permissions');
        await expect(assertSupremePermission('tenant-1', 'READ_METRICS')).resolves.toBeUndefined();
    });

    it('throws SupremeForbiddenError for EXECUTE_OPTIMIZATIONS (disabled by default)', async () => {
        const { tenantSupremePermissionsRepository } = await import(
            '@/infra/repositories/tenant-supreme-permissions.repository'
        );
        vi.mocked(tenantSupremePermissionsRepository.getTenantSupremePermissions).mockResolvedValue(DEFAULTS);

        const { assertSupremePermission, SupremeForbiddenError } = await import(
            '@/lib/governance/supreme-permissions'
        );
        await expect(assertSupremePermission('tenant-1', 'EXECUTE_OPTIMIZATIONS'))
            .rejects.toBeInstanceOf(SupremeForbiddenError);
    });

    it('throws SupremeForbiddenError for ADS_BUDGET (disabled by default)', async () => {
        const { tenantSupremePermissionsRepository } = await import(
            '@/infra/repositories/tenant-supreme-permissions.repository'
        );
        vi.mocked(tenantSupremePermissionsRepository.getTenantSupremePermissions).mockResolvedValue(DEFAULTS);

        const { assertSupremePermission, SupremeForbiddenError } = await import(
            '@/lib/governance/supreme-permissions'
        );
        await expect(assertSupremePermission('tenant-1', 'ADS_BUDGET'))
            .rejects.toBeInstanceOf(SupremeForbiddenError);
    });

    it('does not throw when EXECUTE_OPTIMIZATIONS is explicitly enabled', async () => {
        const { tenantSupremePermissionsRepository } = await import(
            '@/infra/repositories/tenant-supreme-permissions.repository'
        );
        vi.mocked(tenantSupremePermissionsRepository.getTenantSupremePermissions).mockResolvedValue({
            ...DEFAULTS,
            allowExecuteOptimizations: true,
        });

        const { assertSupremePermission } = await import('@/lib/governance/supreme-permissions');
        await expect(assertSupremePermission('tenant-1', 'EXECUTE_OPTIMIZATIONS')).resolves.toBeUndefined();
    });
});

// ── GET /api/internal/tenants/:tenantId/supreme-permissions ───────────────────

describe('GET /api/internal/tenants/:tenantId/supreme-permissions', () => {
    beforeEach(() => vi.clearAllMocks());

    function makeRequest() {
        return new NextRequest('http://localhost/api/internal/tenants/tenant-1/supreme-permissions', { method: 'GET' });
    }

    it('returns 401 when not authenticated', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: false,
            code: 'AUTH_REQUIRED' as any,
            requestId: 'req-test',
            response: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }) as any,
        });

        const { GET } = await import('@/app/api/internal/tenants/[tenantId]/supreme-permissions/route');
        const res = await GET(makeRequest(), { params: Promise.resolve({ tenantId: 'tenant-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 200 with permissions payload when authenticated', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-test',
            session: { sub: 'admin', tenantId: 'tenant-1', role: 'admin', email: 'a@b.com', sv: 1 } as any,
        });

        const { tenantSupremePermissionsRepository } = await import(
            '@/infra/repositories/tenant-supreme-permissions.repository'
        );
        vi.mocked(tenantSupremePermissionsRepository.getTenantSupremePermissions).mockResolvedValue(DEFAULTS);

        const { GET } = await import('@/app/api/internal/tenants/[tenantId]/supreme-permissions/route');
        const res = await GET(makeRequest(), { params: Promise.resolve({ tenantId: 'tenant-1' }) });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.data.allowReadMetrics).toBe(true);
        expect(body.data.allowExecuteOptimizations).toBe(false);
    });
});

// ── PUT /api/internal/tenants/:tenantId/supreme-permissions ──────────────────

describe('PUT /api/internal/tenants/:tenantId/supreme-permissions', () => {
    beforeEach(() => vi.clearAllMocks());

    function makeRequest(body: object = {}) {
        return new NextRequest('http://localhost/api/internal/tenants/tenant-1/supreme-permissions', {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: { 'content-type': 'application/json' },
        });
    }

    it('returns 401 when not authenticated', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: false,
            code: 'AUTH_REQUIRED' as any,
            requestId: 'req-test',
            response: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }) as any,
        });

        const { PUT } = await import('@/app/api/internal/tenants/[tenantId]/supreme-permissions/route');
        const res = await PUT(makeRequest(), { params: Promise.resolve({ tenantId: 'tenant-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 400 when body has no valid fields', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-test',
            session: { sub: 'admin', tenantId: 'tenant-1', role: 'admin', email: 'a@b.com', sv: 1 } as any,
        });

        const { PUT } = await import('@/app/api/internal/tenants/[tenantId]/supreme-permissions/route');
        const res = await PUT(makeRequest({ unknownField: true }), { params: Promise.resolve({ tenantId: 'tenant-1' }) });
        expect(res.status).toBe(400);
    });

    it('returns 200 with updated permissions', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-test',
            session: { sub: 'admin', tenantId: 'tenant-1', role: 'admin', email: 'a@b.com', sv: 1 } as any,
        });

        const { tenantSupremePermissionsRepository } = await import(
            '@/infra/repositories/tenant-supreme-permissions.repository'
        );
        vi.mocked(tenantSupremePermissionsRepository.updateTenantSupremePermissions).mockResolvedValue({
            ...DEFAULTS,
            allowExecuteOptimizations: true,
        });

        const { PUT } = await import('@/app/api/internal/tenants/[tenantId]/supreme-permissions/route');
        const res = await PUT(
            makeRequest({ allowExecuteOptimizations: true }),
            { params: Promise.resolve({ tenantId: 'tenant-1' }) }
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.data.allowExecuteOptimizations).toBe(true);
    });
});
