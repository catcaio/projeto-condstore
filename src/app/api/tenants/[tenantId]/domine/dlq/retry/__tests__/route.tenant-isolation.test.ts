import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/infra/auth/tenant-route-guard', () => ({
  extractTenantIdFromTenantRoute: vi.fn((req: NextRequest) => req.url.split('/tenants/')[1]?.split('/')[0]),
  requireSessionTenantMatch: vi.fn(),
}));
vi.mock('@/infra/repositories/domine-events.repository', () => ({ domineEventsRepository: { retryFromDLQ: vi.fn() } }));
vi.mock('@/infra/http/request-trace', () => ({ makeRequestId: () => 'test-req-id' }));
vi.mock('@/infra/log/logger', () => ({ structuredLogger: { info: vi.fn() } }));

import { POST } from '../route';
import { requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';

const ctx = (tenantId: string) => ({ params: Promise.resolve({ tenantId }) });
const req = (tenantId: string, dlqEntryId: string) => new NextRequest(`http://localhost/api/tenants/${tenantId}/domine/dlq/retry`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dlqEntryId }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSessionTenantMatch).mockResolvedValue({ ok: true, tenantId: 'tenant-a', sessionUser: { role: 'admin', sub: 'user-a' } });
});

describe('DLQ retry tenant isolation regression', () => {
  it('tenant A + nonexistent DLQ entry must return 404', async () => {
    vi.mocked(domineEventsRepository.retryFromDLQ).mockResolvedValue(false);
    const res = await POST(req('tenant-a', 'missing'), ctx('tenant-a'));
    expect(res.status).toBe(404);
  });

  it('tenant B + DLQ entry owned by tenant A must not expose tenant A data', async () => {
    vi.mocked(requireSessionTenantMatch).mockResolvedValue({ ok: false, response: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) });
    vi.mocked(domineEventsRepository.retryFromDLQ).mockResolvedValue(true);
    const res = await POST(req('tenant-b', 'dlq-a'), ctx('tenant-b'));
    const body = await res.text();
    expect(res.status).toBe(403);
    expect(body).not.toContain('dlq-a');
    expect(body).not.toContain('tenant-a');
  });
});
