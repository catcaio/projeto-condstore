import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/infra/auth/tenant-route-guard', () => ({
  extractTenantIdFromTenantRoute: vi.fn((req: NextRequest) => req.url.split('/tenants/')[1]?.split('/')[0]),
  requireSessionTenantMatch: vi.fn(),
}));
vi.mock('@/infra/repositories/domine-read.repository', () => ({ domineReadRepository: { getOrder: vi.fn() } }));
vi.mock('@/infra/http/request-trace', () => ({ makeRequestId: () => 'test-req-id' }));
vi.mock('@/infra/config/internal-token', () => ({ getInternalExportTokenOrThrow: vi.fn(() => 'internal-test-token') }));

import { GET } from '../route';
import { requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { domineReadRepository } from '@/infra/repositories/domine-read.repository';

const orderA = { orderId: 'order-a', tenantId: 'tenant-a', total: 100 };
const ctx = (tenantId: string, orderId: string) => ({ params: Promise.resolve({ tenantId, orderId }) });
const request = (tenantId: string, orderId: string, authorization?: string) => new NextRequest(
  `http://localhost/api/tenants/${tenantId}/domine/orders/${orderId}`,
  authorization ? { headers: { authorization } } : undefined,
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSessionTenantMatch).mockResolvedValue({ ok: true, tenantId: 'tenant-a', sessionUser: { role: 'admin', sub: 'user-a' } });
});

describe('Domine order tenant isolation regression', () => {
  it('tenant A + nonexistent order must return 404', async () => {
    vi.mocked(domineReadRepository.getOrder).mockResolvedValue(null);
    const res = await GET(request('tenant-a', 'missing'), ctx('tenant-a', 'missing'));
    expect(res.status).toBe(404);
  });

  it('tenant B + order owned by tenant A must return 403 without exposing data', async () => {
    vi.mocked(requireSessionTenantMatch).mockResolvedValue({ ok: true, tenantId: 'tenant-b', sessionUser: { role: 'admin', sub: 'user-b' } });
    vi.mocked(domineReadRepository.getOrder).mockResolvedValue(null);
    const res = await GET(request('tenant-b', 'order-a'), ctx('tenant-b', 'order-a'));
    const body = await res.text();
    expect(res.status).toBe(403);
    expect(body).not.toContain('order-a');
    expect(body).not.toContain('tenant-a');
  });

  it('internal token must not bypass tenant isolation', async () => {
    vi.mocked(requireSessionTenantMatch).mockResolvedValue({ ok: false, response: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) });
    vi.mocked(domineReadRepository.getOrder).mockResolvedValue(orderA);
    const res = await GET(request('tenant-b', 'order-a', 'Bearer internal-test-token'), ctx('tenant-b', 'order-a'));
    const body = await res.text();
    expect(res.status).toBe(403);
    expect(body).not.toContain('order-a');
    expect(body).not.toContain('tenant-a');
  });
});
