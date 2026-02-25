import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../route';
import { getSessionUser } from '../../../../../../infra/auth/session';
import { adminAuditLogRepository } from '../../../../../../infra/repositories/admin-audit-log.repository';
import { attributionClickRepository } from '../../../../../../infra/repositories/attribution-click.repository';

vi.mock('../../../../../../infra/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('../../../../../../infra/repositories/attribution-click.repository', () => ({
  attributionClickRepository: {
    insertMany: vi.fn().mockResolvedValue(undefined),
    listByTenant: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  },
}));

vi.mock('../../../../../../infra/repositories/admin-audit-log.repository', () => ({
  adminAuditLogRepository: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

function adminSession() {
  return {
    sub: 'user-1',
    email: 'admin@example.com',
    tenantId: 'tenant-1',
    role: 'admin',
    sv: 1,
  };
}

describe('/api/cockpit/attribution/tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue(adminSession());
  });

  it('POST returns 401 without session', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const res = await POST({
      json: vi.fn().mockResolvedValue({ count: 1, tenantId: 'tenant-1' }),
    } as never);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'UNAUTHORIZED' });
  });

  it('POST returns 403 for non-admin', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      ...adminSession(),
      role: 'operator',
    });

    const res = await POST({
      json: vi.fn().mockResolvedValue({ count: 1, tenantId: 'tenant-1' }),
    } as never);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'FORBIDDEN' });
  });

  it('POST returns 200, creates requested count and tokens are unique', async () => {
    const res = await POST({
      json: vi.fn().mockResolvedValue({
        count: 5,
        tenantId: 'tenant-1',
        campaign: 'frete_2026_02_google',
        source: 'google',
        medium: 'cpc',
      }),
    } as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.count).toBe(5);
    expect(data.final_url_template).toContain('/t/{token}?utm_source=google');
    expect(data.tokens).toHaveLength(5);

    const tokenValues = data.tokens.map((t: { token: string }) => t.token);
    expect(new Set(tokenValues).size).toBe(5);
    expect(attributionClickRepository.insertMany).toHaveBeenCalledTimes(1);
    expect((attributionClickRepository.insertMany as ReturnType<typeof vi.fn>).mock.calls[0][0]).toHaveLength(5);
    expect(adminAuditLogRepository.log).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      userId: 'user-1',
      action: 'attribution.generate_tokens',
    }));
  });

  it('GET returns 200 with paginated token list filtered by campaign', async () => {
    vi.mocked(attributionClickRepository.listByTenant).mockResolvedValue({
      total: 1,
      items: [{
        id: 'row-1',
        token: 'tok_1',
        tenantId: 'tenant-1',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'frete_2026_02_google',
        utmTerm: null,
        utmContent: null,
        clickId: null,
        landingUrl: null,
        userAgentHash: null,
        ipHash: null,
        consumedAt: null,
        createdAt: new Date('2026-02-25T00:00:00.000Z'),
      }] as never,
    });

    const res = await GET({
      nextUrl: new URL('http://localhost/api/cockpit/attribution/tokens?campaign=frete_2026_02_google&page=1&limit=10'),
    } as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(1);
    expect(data.items[0]).toMatchObject({
      token: 'tok_1',
      utmCampaign: 'frete_2026_02_google',
    });
    expect(attributionClickRepository.listByTenant).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      campaign: 'frete_2026_02_google',
      page: 1,
      limit: 10,
    });
    expect(adminAuditLogRepository.log).not.toHaveBeenCalled();
  });
});
