import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/infra/auth/tenant-route-guard', () => ({ requireSessionTenantMatch: vi.fn() }));
vi.mock('@/infra/auth/guards', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/infra/http/request-trace', () => ({ makeRequestId: () => 'test-req-id' }));
vi.mock('@/infra/repositories/end-user-consent.repository', () => ({ endUserConsentRepository: { getConsent: vi.fn(), revokeConsent: vi.fn() } }));
vi.mock('@/infra/db', () => ({ getDb: vi.fn() }));

import { POST } from '../route';
import { requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { endUserConsentRepository } from '@/infra/repositories/end-user-consent.repository';

const consentA = { tenantId: 'tenant-a', phoneHash: 'hash-a', consentGiven: true, blockedAttempts: 0, consentTimestamp: new Date().toISOString() };
const ctx = (tenantId: string, action: string) => ({ params: Promise.resolve({ tenantId, action }) });
const req = (tenantId: string, body: unknown) => new NextRequest(`http://localhost/api/tenants/${tenantId}/privacy/export`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSessionTenantMatch).mockResolvedValue({ ok: true, tenantId: 'tenant-a', sessionUser: { role: 'admin', sub: 'user-a' } });
  vi.mocked(endUserConsentRepository.getConsent).mockResolvedValue(null);
});

describe('Privacy action tenant isolation regression', () => {
  it('tenant A + nonexistent identity must return 404', async () => {
    const res = await POST(req('tenant-a', { phoneHash: 'missing' }), ctx('tenant-a', 'export'));
    expect(res.status).toBe(404);
  });

  it('tenant B + identity owned by tenant A must return 403 and contain no tenant A data', async () => {
    vi.mocked(requireSessionTenantMatch).mockResolvedValue({ ok: false, response: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) });
    vi.mocked(endUserConsentRepository.getConsent).mockResolvedValue(consentA);
    const res = await POST(req('tenant-b', { phoneHash: 'hash-a' }), ctx('tenant-b', 'export'));
    const body = await res.text();
    expect(res.status).toBe(403);
    expect(body).not.toContain('hash-a');
    expect(body).not.toContain('tenant-a');
  });
});
