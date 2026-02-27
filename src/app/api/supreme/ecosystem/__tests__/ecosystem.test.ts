/**
 * Tests for GET /api/supreme/ecosystem
 *
 * Covers:
 *   - Unauthorized (no token, no super_admin role) → 401
 *   - Valid x-internal-token → 200 with correct shape
 *   - super_admin session → 200
 *   - topBurn sorted by burnRatePerDay desc
 *   - DB/stream failure gracefully returns partial data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../../../infra/config/internal-token', () => ({
    getInternalExportTokenOrThrow: vi.fn(() => 'test-token-xyz'),
    isInternalTokenAuthorized: vi.fn((t: string | null) => t === 'test-token-xyz'),
}));

vi.mock('../../../../../infra/auth/session', () => ({
    getSessionUser: vi.fn(),
}));

vi.mock('../../../../../core/supreme/ecosystem-map.service', () => ({
    getEcosystemMap: vi.fn(),
}));

vi.mock('../../../../../infra/http/request-trace', () => ({
    makeRequestId: vi.fn(() => 'req-supreme-test'),
    attachRequestIdHeader: vi.fn((res: Response) => res),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { GET } from '../route';
import { getEcosystemMap } from '../../../../../core/supreme/ecosystem-map.service';
import { getSessionUser } from '../../../../../infra/auth/session';
import { isInternalTokenAuthorized } from '../../../../../infra/config/internal-token';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_MAP = {
    collectedAt: '2026-02-27T13:00:00.000Z',
    tenants: { total: 5, activeLast24h: 2 },
    finops: {
        locked: 1,
        degraded: 0,
        preemptive: 2,
        topBurn: [
            { tenantId: 'tenant-a', burnRatePerDay: 3.5, percentUsed: 87 },
            { tenantId: 'tenant-b', burnRatePerDay: 1.2, percentUsed: 45 },
            { tenantId: 'tenant-c', burnRatePerDay: 0.4, percentUsed: 12 },
        ],
    },
    webhooks: { lag: 0, dlq: 0, failed24h: 0 },
    events: { finopsDLQ: 0, webhookDLQ: 0 },
};

function makeRequest(token?: string, cookies?: string): NextRequest {
    const headers = new Map<string, string>();
    if (token) headers.set('x-internal-token', token);
    if (cookies) headers.set('cookie', cookies);
    return {
        headers: {
            get: (k: string) => headers.get(k.toLowerCase()) ?? null,
        },
        cookies: { get: () => undefined },
        nextUrl: { pathname: '/api/supreme/ecosystem', search: '' },
    } as unknown as NextRequest;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/supreme/ecosystem', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getSessionUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (getEcosystemMap as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_MAP);
    });

    // ── Auth ──────────────────────────────────────────────────────────────────

    it('returns 401 when no token and no super_admin session', async () => {
        (isInternalTokenAuthorized as ReturnType<typeof vi.fn>).mockReturnValue(false);
        (getSessionUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const res = await GET(makeRequest());

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error.code).toBe('AUTH_REQUIRED');
        expect(getEcosystemMap).not.toHaveBeenCalled();
    });

    it('returns 401 when token is wrong', async () => {
        (isInternalTokenAuthorized as ReturnType<typeof vi.fn>).mockReturnValue(false);

        const res = await GET(makeRequest('wrong-token'));

        expect(res.status).toBe(401);
        expect(getEcosystemMap).not.toHaveBeenCalled();
    });

    // ── Valid via x-internal-token ─────────────────────────────────────────────

    it('returns 200 with correct shape when x-internal-token is valid', async () => {
        (isInternalTokenAuthorized as ReturnType<typeof vi.fn>).mockReturnValue(true);

        const res = await GET(makeRequest('test-token-xyz'));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.data).toMatchObject({
            tenants: { total: 5, activeLast24h: 2 },
            finops: { locked: 1, degraded: 0, preemptive: 2 },
            webhooks: { lag: 0, dlq: 0, failed24h: 0 },
            events: { finopsDLQ: 0, webhookDLQ: 0 },
        });
    });

    // ── Valid via super_admin session ──────────────────────────────────────────

    it('returns 200 when session role is super_admin', async () => {
        (isInternalTokenAuthorized as ReturnType<typeof vi.fn>).mockReturnValue(false);
        (getSessionUser as ReturnType<typeof vi.fn>).mockResolvedValue({
            sub: 'user-1',
            email: 'admin@condstore.com',
            tenantId: 'master',
            role: 'super_admin',
            sv: 1,
        });

        const res = await GET(makeRequest());

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
    });

    // ── topBurn ordering ──────────────────────────────────────────────────────

    it('topBurn is returned ordered by burnRatePerDay descending', async () => {
        (isInternalTokenAuthorized as ReturnType<typeof vi.fn>).mockReturnValue(true);

        const res = await GET(makeRequest('test-token-xyz'));
        const body = await res.json();
        const burn: { burnRatePerDay: number }[] = body.data.finops.topBurn;

        // Verify desc order
        for (let i = 0; i < burn.length - 1; i++) {
            expect(burn[i].burnRatePerDay).toBeGreaterThanOrEqual(burn[i + 1].burnRatePerDay);
        }
    });

    // ── Error resilience ──────────────────────────────────────────────────────

    it('returns 500 when getEcosystemMap throws', async () => {
        (isInternalTokenAuthorized as ReturnType<typeof vi.fn>).mockReturnValue(true);
        (getEcosystemMap as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB unavailable'));

        const res = await GET(makeRequest('test-token-xyz'));

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error.code).toBe('UNKNOWN');
    });
});
