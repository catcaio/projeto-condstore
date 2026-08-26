import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/infra/auth/tenant-route-guard', () => ({ requireAdminSession: vi.fn() }));
vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/infra/http/request-trace', () => ({ makeRequestId: () => 'test-req-id' }));
vi.mock('@/infra/log/logger', () => ({ structuredLogger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { POST } from '../route';
import { requireAdminSession } from '@/infra/auth/tenant-route-guard';
import { getDb } from '@/infra/db';

const ctx = (tenantId: string) => ({ params: Promise.resolve({ tenantId }) });
const req = (tenantId: string, phoneHash: string) => new NextRequest(`http://localhost/api/tenants/${tenantId}/privacy/export-user`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneHash }) });
const chain = (rows: unknown[]) => {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where, limit: vi.fn().mockResolvedValue(rows) });
  return { select: vi.fn().mockReturnValue({ from }) };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdminSession).mockResolvedValue({ ok: true, tenantId: 'tenant-a', sessionUser: { role: 'admin', sub: 'user-a' } } as never);
});

describe('Privacy export tenant isolation regression', () => {
  it('tenant A + nonexistent identity must return 404', async () => {
    vi.mocked(getDb).mockResolvedValue(chain([]) as never);
    const res = await POST(req('tenant-a', 'missing'), ctx('tenant-a'));
    expect(res.status).toBe(404);
  });

  it('tenant B + identity owned by tenant A must return 403 and contain no tenant A data', async () => {
    const res = await POST(req('tenant-b', 'hash-a'), ctx('tenant-b'));
    const body = await res.text();
    expect(res.status).toBe(403);
    expect(body).not.toContain('hash-a');
    expect(body).not.toContain('tenant-a');
  });
});
