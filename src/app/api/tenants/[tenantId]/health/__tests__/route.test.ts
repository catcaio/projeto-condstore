import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/infra/auth/tenant-route-guard', () => ({
    extractTenantIdFromTenantRoute: vi.fn(),
    requireSessionTenantMatch: vi.fn()
}));

vi.mock('@/infra/http/request-trace', () => ({
    makeRequestId: () => 'test-req-id',
}));

import { requireSessionTenantMatch, extractTenantIdFromTenantRoute } from '@/infra/auth/tenant-route-guard';
import { NextResponse } from 'next/server';

describe('Health Route (Tenant Cockpit)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should block if user is not admin', async () => {
        const req = new NextRequest('http://localhost/api/tenants/t1/health');

        // Mock route extractor
        (extractTenantIdFromTenantRoute as any).mockReturnValue('t1');

        // Mock guard for non-admin user
        (requireSessionTenantMatch as any).mockResolvedValue({
            ok: true,
            tenantId: 't1',
            sessionUser: { role: 'user', sub: 'u1' }
        });

        const res = await GET(req, { params: Promise.resolve({ tenantId: 't1' }) }) as NextResponse;

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error.message).toBe('Forbidden');
    });

    it('should block if tenant mismatch', async () => {
        const req = new NextRequest('http://localhost/api/tenants/t1/health');

        // Mock route extractor
        (extractTenantIdFromTenantRoute as any).mockReturnValue('t1');

        // Mock guard for tenant mismatch
        (requireSessionTenantMatch as any).mockResolvedValue({
            ok: false,
            response: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
        });

        const res = await GET(req, { params: Promise.resolve({ tenantId: 't1' }) }) as NextResponse;

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toBe('FORBIDDEN');
    });
});
