import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/infra/auth/tenant-route-guard', () => ({
  extractTenantIdFromTenantRoute: vi.fn((req: NextRequest) => req.url.split('/tenants/')[1]?.split('/')[0]),
  requireSessionTenantMatch: vi.fn(),
}));
vi.mock('@/infra/repositories/deliveries.repository', () => ({ deliveriesRepository: { findDeliveryById: vi.fn() } }));
vi.mock('@/infra/log/logger', () => ({ structuredLogger: { error: vi.fn() } }));

import { GET } from '../route';
import { requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { deliveriesRepository } from '@/infra/repositories/deliveries.repository';

const deliveryA = { id: 'delivery-a', tenantId: 'tenant-a', status: 'delivered' };
const ctx = (tenantId: string, id: string) => ({ params: Promise.resolve({ tenantId, id }) });
const req = (tenantId: string, id: string) => new NextRequest(`http://localhost/api/tenants/${tenantId}/deliveries/${id}`);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSessionTenantMatch).mockResolvedValue({ ok: true, tenantId: 'tenant-a', sessionUser: { role: 'admin', sub: 'user-a' } });
});

describe('Delivery tenant isolation regression', () => {
  it('tenant A + nonexistent delivery must return 404', async () => {
    vi.mocked(deliveriesRepository.findDeliveryById).mockResolvedValue(null);
    const res = await GET(req('tenant-a', 'missing'), ctx('tenant-a', 'missing'));
    expect(res.status).toBe(404);
  });

  it('tenant B + delivery owned by tenant A must not expose tenant A data', async () => {
    vi.mocked(requireSessionTenantMatch).mockResolvedValue({ ok: false, response: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) });
    vi.mocked(deliveriesRepository.findDeliveryById).mockResolvedValue(deliveryA);
    const res = await GET(req('tenant-b', 'delivery-a'), ctx('tenant-b', 'delivery-a'));
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(JSON.stringify(body)).not.toContain('delivery-a');
    expect(JSON.stringify(body)).not.toContain('tenant-a');
  });
});
