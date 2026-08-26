import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/infra/auth/tenant-route-guard', () => ({ requireAdminSession: vi.fn() }));
vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/infra/http/request-trace', () => ({ makeRequestId: () => 'test-req-id' }));
vi.mock('@/infra/log/logger', () => ({ structuredLogger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { POST } from '../route';
import { requireAdminSession } from '@/infra/auth/tenant-route-guard';

const ctx = (tenantId: string) => ({ params: Promise.resolve({ tenantId }) });
const req = (tenantId: string, phoneHash: string) => new NextRequest(`http://localhost/api/tenants/${tenantId}/privacy/export-user`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneHash }) });
const chain = (rows: unknown[]) => {
  const where = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where, limit });
  const select = vi.fn().mockReturnValue({ from });
  return { select };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdminSession).mockResolvedValue({ ok: true, tenantId: 'tenant-a', sessionUser: { role: 'admin', sub: 'user-a' } } as never);
});

describe('Privacy export tenant isolation regression', () => {
  it('tenant A + nonexistent identity must return 404 or an empty non-sensitive result', async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ ok: true, tenantId: 'tenant-a', sessionUser: { role: 'admin', sub: 'user-a' } } as never);
    const db = chain([]);
    vi.mocked(requireAdminSession);
    const { getDb } = await import('@/infra/db');
    vi.mocked(getDb).mockResolvedValue(db as never);
    const res = await POST(req('tenant-a', 'missing'), ctx('tenant-a'));
    expect([200, 404]).toContain(res.status);
    const body = await res.text();
    expect(body).not.toContain('tenant-b');
  });

  it('tenant B + identity owned by tenant A must return 403 and contain no tenant A data', async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ ok: true, tenantId: 'tenant-a', sessionUser: { role: 'admin', sub: 'user-a' } } as never);
    const db = chain([{ tenantId: 'tenant-a', phoneHash: 'hash-a', body: 'SECRET-A' }]);
    const { getDb } = await import('@/infra/db');
    vi.mocked(getDb).mockResolvedValue(db as never);
    const res = await POST(req('tenant-b', 'hash-a'), ctx('tenant-b'));
    const body = await res.text();
    expect(res.status).toBe(403);
    expect(body).not.toContain('SECRET-A');
    expect(body).not.toContain('tenant-a');
  });
});
