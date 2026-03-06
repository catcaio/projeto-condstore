/**
 * operational-event-bus.test.ts
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
}));

vi.mock('@/infra/http/error-response', () => ({
    ErrorCode: {
        UNKNOWN: 'UNKNOWN',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        AUTH_REQUIRED: 'AUTH_REQUIRED',
    },
    errorResponse: vi.fn((code: string, status: number, _id: string, msg: string) =>
        new Response(JSON.stringify({ error: code, message: msg }), { status })
    ),
}));

// ── publishOperationalEvent unit tests ────────────────────────────────────────

describe('publishOperationalEvent', () => {
    beforeEach(() => vi.clearAllMocks());

    function makeMockDb() {
        const chain: any = {
            insert: vi.fn(() => chain),
            values: vi.fn().mockResolvedValue([]),
            select: vi.fn(() => chain),
            from: vi.fn(() => chain),
            where: vi.fn(() => chain),
            orderBy: vi.fn(() => chain),
            limit: vi.fn().mockResolvedValue([]),
        };
        return chain;
    }

    it('persists a valid event and resolves', async () => {
        const mockDb = makeMockDb();
        const { getDb } = await import('@/infra/db');
        vi.mocked(getDb).mockResolvedValue(mockDb as any);

        const { publishOperationalEvent } = await import('@/lib/events/operational-event-bus');
        await expect(publishOperationalEvent({
            tenantId: 'tenant-1',
            eventType: 'quote_created',
            eventDomain: 'CONVERSION',
            payload: { weightInKg: 5 },
        })).resolves.toBeUndefined();

        expect(mockDb.insert).toHaveBeenCalled();
    });

    it('rejects unknown domain silently (logs warn, does not throw)', async () => {
        const { structuredLogger } = await import('@/infra/log/logger');
        const { publishOperationalEvent } = await import('@/lib/events/operational-event-bus');

        // No DB mock needed — should halt before DB call
        await expect(publishOperationalEvent({
            tenantId: 'tenant-1',
            eventType: 'foo_event',
            eventDomain: 'UNKNOWN_DOMAIN' as any,
        })).resolves.toBeUndefined();

        expect(structuredLogger.warn).toHaveBeenCalledWith(
            'operational_event_validation_error',
            expect.objectContaining({ error: expect.stringContaining('Unknown event domain') })
        );
    });

    it('rejects missing tenantId silently', async () => {
        const { structuredLogger } = await import('@/infra/log/logger');
        const { publishOperationalEvent } = await import('@/lib/events/operational-event-bus');

        await expect(publishOperationalEvent({
            tenantId: '',
            eventType: 'quote_created',
            eventDomain: 'CONVERSION',
        })).resolves.toBeUndefined();

        expect(structuredLogger.warn).toHaveBeenCalledWith(
            'operational_event_validation_error',
            expect.objectContaining({ error: expect.stringContaining('tenantId is required') })
        );
    });
});

// ── GET /api/internal/tenants/:tenantId/operational-events ───────────────────

describe('GET /api/internal/tenants/:tenantId/operational-events', () => {
    beforeEach(() => vi.clearAllMocks());

    function makeRequest(tenantId = 'tenant-1', queryParams = '') {
        return new NextRequest(
            `http://localhost/api/internal/tenants/${tenantId}/operational-events${queryParams}`,
            { method: 'GET' }
        );
    }

    function makeSelectChain(rows: any[] = []) {
        const chain: any = {
            select: vi.fn(() => chain),
            from: vi.fn(() => chain),
            where: vi.fn(() => chain),
            orderBy: vi.fn(() => chain),
            limit: vi.fn().mockResolvedValue(rows),
        };
        return chain;
    }

    it('returns 401 when not authenticated', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: false,
            code: 'AUTH_REQUIRED' as any,
            requestId: 'req-test',
            response: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }) as any,
        });

        const { GET } = await import('@/app/api/internal/tenants/[tenantId]/operational-events/route');
        const res = await GET(makeRequest(), { params: Promise.resolve({ tenantId: 'tenant-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns event list for authenticated admin', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-test',
            session: { sub: 'admin', tenantId: 't1', role: 'admin', email: 'a@b.com', sv: 1 } as any,
        });

        const mockRow = {
            id: 'evt-1',
            tenantId: 'tenant-1',
            eventType: 'quote_created',
            eventDomain: 'CONVERSION',
            payload: {},
            createdAt: new Date(),
        };

        const { getDb } = await import('@/infra/db');
        vi.mocked(getDb).mockResolvedValue(makeSelectChain([mockRow]) as any);

        const { GET } = await import('@/app/api/internal/tenants/[tenantId]/operational-events/route');
        const res = await GET(makeRequest(), { params: Promise.resolve({ tenantId: 'tenant-1' }) });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].eventType).toBe('quote_created');
    });

    it('returns 400 for invalid domain filter', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-test',
            session: { sub: 'admin', tenantId: 't1', role: 'admin', email: 'a@b.com', sv: 1 } as any,
        });

        const { GET } = await import('@/app/api/internal/tenants/[tenantId]/operational-events/route');
        const res = await GET(makeRequest('tenant-1', '?domain=INVALID'), { params: Promise.resolve({ tenantId: 'tenant-1' }) });
        expect(res.status).toBe(400);
    });

    it('filters by domain and eventType when provided', async () => {
        const { requireAdmin } = await import('@/infra/auth/guards');
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-test',
            session: { sub: 'admin', tenantId: 't1', role: 'admin', email: 'a@b.com', sv: 1 } as any,
        });

        const chain = makeSelectChain([]);
        const { getDb } = await import('@/infra/db');
        vi.mocked(getDb).mockResolvedValue(chain as any);

        const { GET } = await import('@/app/api/internal/tenants/[tenantId]/operational-events/route');
        const res = await GET(
            makeRequest('tenant-1', '?domain=ACQUISITION&eventType=lead_created&limit=10'),
            { params: Promise.resolve({ tenantId: 'tenant-1' }) }
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.meta.limit).toBe(10);
    });
});
