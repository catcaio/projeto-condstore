import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/infra/auth/tenant-route-guard', () => ({ requireAdminSession: vi.fn() }));
vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));
vi.mock('@/infra/http/request-trace', () => ({ makeRequestId: () => 'test-req-id' }));
vi.mock('@/infra/log/logger', () => ({ structuredLogger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('@/infra/repositories/end-user-consent.repository', () => ({ endUserConsentRepository: { revokeConsent: vi.fn() } }));
vi.mock('@/modules/privacy/vector-purge.service', () => ({ vectorPurgeService: { deleteEmbeddingsByUser: vi.fn() } }));

import { DELETE } from '../route';
import { requireAdminSession } from '@/infra/auth/tenant-route-guard';

const ctx = (tenantId: string) => ({ params: Promise.resolve({ tenantId }) });
const req = (tenantId: string, phoneHash: string) => new NextRequest(`http://localhost/api/tenants/${tenantId}/privacy/purge-user`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneHash }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdminSession).mockResolvedValue({ ok: true, tenantId: 'tenant-a', sessionUser: { role: 'admin', sub: 'user-a' } } as never);
});

describe('Privacy purge tenant isolation regression', () => {
  it('tenant A + nonexistent identity must return 404 baseline', async () => {
    const res = await DELETE(req('tenant-a', 'missing'), ctx('tenant-a'));
    expect(res.status).toBe(404);
  });

  it('tenant B + identity owned by tenant A must return 403 and contain no tenant A data', async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ ok: true, tenantId: 'tenant-a', sessionUser: { role: 'admin', sub: 'user-a' } } as never);
    const res = await DELETE(req('tenant-b', 'hash-a'), ctx('tenant-b'));
    const body = await res.text();
    expect(res.status).toBe(403);
    expect(body).not.toContain('tenant-a');
    expect(body).not.toContain('hash-a');
  });
});
