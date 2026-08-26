import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/infra/auth/tenant-route-guard', () => ({
  extractTenantIdFromTenantRoute: vi.fn((req: NextRequest) => req.url.split('/tenants/')[1]?.split('/')[0]),
  requireSessionTenantMatch: vi.fn(),
}));
vi.mock('@/infra/config/internal-token', () => ({ getInternalExportTokenOrThrow: vi.fn(() => 'token-for-tenant-a') }));
vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/infra/http/request-trace', () => ({ makeRequestId: () => 'test-req-id' }));

import { GET } from '../route';
import { requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { getDb } from '@/infra/db';

const quoteA = { id: 'quote-a', tenantId: 'tenant-a', correlationId: 'corr-a', price: 42 };
const ctx = (tenantId: string) => ({ params: Promise.resolve({ tenantId }) });
const req = (tenantId: string) => new NextRequest(`http://localhost/api/tenants/${tenantId}/domine/freight/latest`, { headers: { authorization: 'Bearer token-for-tenant-a' } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSessionTenantMatch).mockResolvedValue({ ok: false, response: new Response('FORBIDDEN', { status: 403 }) } as never);
});

describe('Latest freight internal-token tenant isolation regression', () => {
  it('tenant B must not receive tenant A quote through an internal token issued for tenant A', async () => {
    const where = vi.fn().mockResolvedValue([quoteA]);
    const orderBy = vi.fn().mockResolvedValue([quoteA]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    vi.mocked(getDb).mockResolvedValue({ select } as never);

    const res = await GET(req('tenant-b'), ctx('tenant-b'));
    const body = await res.text();
    expect(res.status).toBe(403);
    expect(body).not.toContain('quote-a');
    expect(body).not.toContain('tenant-a');
    expect(orderBy).not.toHaveBeenCalled();
  });
});
