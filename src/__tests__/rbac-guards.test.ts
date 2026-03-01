import { NextRequest } from 'next/server';
import { requireAdmin } from '../infra/auth/guards';
import { requireSessionTenantMatch, requireInternalToken } from '../infra/auth/tenant-route-guard';
import * as sessionModule from '../infra/auth/session';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../infra/auth/session', () => ({
    getSessionUser: vi.fn(),
}));

describe('RBAC Security Guards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.INTERNAL_TOKEN = 'secret-token';
    });

    it('requireAdmin should reject access if no session is present', async () => {
        vi.mocked(sessionModule.getSessionUser).mockResolvedValueOnce(null);
        const req = new NextRequest('http://localhost/api/admin');
        const result = await requireAdmin(req);

        expect(result.ok).toBe(false);
        expect((result as any).response?.status).toBe(401);
    });

    it('requireAdmin should reject access if role is not admin', async () => {
        vi.mocked(sessionModule.getSessionUser).mockResolvedValueOnce({ sub: '123', tenantId: 'tnt', role: 'viewer' } as any);
        const req = new NextRequest('http://localhost/api/admin');
        const result = await requireAdmin(req);

        expect(result.ok).toBe(false);
        expect((result as any).response?.status).toBe(403);
    });

    it('requireSessionTenantMatch should block cross-tenant IDOR attacks', async () => {
        vi.mocked(sessionModule.getSessionUser).mockResolvedValueOnce({ sub: '123', tenantId: 'tnt-abc', role: 'admin' } as any);
        const req = new NextRequest('http://localhost/api/tnt-xyz/data');
        const result = await requireSessionTenantMatch(req, 'tnt-xyz');

        expect(result.ok).toBe(false);
        expect((result as any).response?.status).toBe(403);
    });

    it('requireInternalToken should block requests without the valid environment secret', () => {
        const req = new NextRequest('http://localhost/api/internal/test');
        req.headers.set('x-internal-token', 'wrong-token');

        const result = requireInternalToken(req);
        expect(result.ok).toBe(false);
        expect((result as any).response?.status).toBe(401);
    });

    it('requireInternalToken should allow requests possessing the valid env secret', () => {
        const req = new NextRequest('http://localhost/api/internal/test');
        req.headers.set('x-internal-token', 'secret-token');

        const result = requireInternalToken(req);
        expect(result.ok).toBe(true);
    });
});
