import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/infra/auth/tenant-route-guard', () => ({
  extractTenantIdFromTenantRoute: vi.fn((req: NextRequest) => req.url.split('/tenants/')[1]?.split('/')[0]),
  requireSessionTenantMatch: vi.fn(),
}));
vi.mock('@/infra/repositories/domine-read.repository', () => ({ domineReadRepository: { getOrder: vi.fn() } }));
vi.mock('@/infra/http/request-trace', () => ({ makeRequestId: () => 'test-req-id' }));
vi.mock('@/infra/config/internal-token', () => ({ getInternalExportTokenOrThrow: vi.fn(() => 'internal-test-token') }));
vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));

import { POST } from '../route';
import { requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { domineReadRepository } from '@/infra/repositories/domine-read.repository';
import { getDb } from '@/infra/db';

const orderA = { orderId: 'order-a', tenantId: 'tenant-a', total: 100 };
const quoteA = { id: 'quote-a', tenantId: 'tenant-a', correlationId: 'corr-a', price: 42 };

const ctx = (tenantId: string) => ({ params: Promise.resolve({ tenantId }) });
const req = (tenantId: string, body: unknown, internal = false) => new NextRequest(
  `http://localhost/api/tenants/${tenantId}/domine/actions`,
  { method: 'POST', headers: { 'content-type': 'application/json', ...(internal ? { authorization: 'Bearer internal-test-token' } : {}) }, body: JSON.stringify(body) }
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSessionTenantMatch).mockResolvedValue({ ok: true, tenantId: 'tenant-a', sessionUser: { role: 'admin', sub: 'user-a' } });
});

describe('Domine actions tenant isolation regressions', () => {
  it('lookup_order: nonexistent order must return an explicit 404 baseline', async () => {
    vi.mocked(domineReadRepository.getOrder).mockResolvedValue(null);
    const res = await POST(req('tenant-a', { action: 'lookup_order', parameters: { orderId: 'missing' } }), ctx('tenant-a'));
    expect(res.status).toBe(404);
  });

  it('lookup_order: cross-tenant order must not expose tenant A data', async () => {
    vi.mocked(domineReadRepository.getOrder).mockResolvedValue(null);
    const res = await POST(req('tenant-b', { action: 'lookup_order', parameters: { orderId: 'order-a' } }), ctx('tenant-b'));
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(JSON.stringify(body)).not.toContain('order-a');
    expect(JSON.stringify(body)).not.toContain('tenant-a');
  });

  it('lookup_order: internal token must not bypass tenant isolation', async () => {
    vi.mocked(domineReadRepository.getOrder).mockResolvedValue(orderA);
    const res = await POST(req('tenant-b', { action: 'lookup_order', parameters: { orderId: 'order-a' } }, true), ctx('tenant-b'));
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(JSON.stringify(body)).not.toContain('order-a');
    expect(JSON.stringify(body)).not.toContain('tenant-a');
  });

  it('lookup_freight: cross-tenant correlationId must not return tenant A quote', async () => {
    const where = vi.fn().mockResolvedValue([quoteA]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    vi.mocked(getDb).mockResolvedValue({ select } as never);

    const res = await POST(req('tenant-b', { action: 'lookup_freight', parameters: { correlationId: 'corr-a' } }, true), ctx('tenant-b'));
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('quote-a');
    expect(JSON.stringify(body)).not.toContain('tenant-a');
  });
});
