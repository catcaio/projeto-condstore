import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PUT } from '../route';
import { getSessionUser } from '../../../../../../infra/auth/session';
import { adminAuditLogRepository } from '../../../../../../infra/repositories/admin-audit-log.repository';
import { tenantRepository } from '../../../../../../infra/repositories/tenant.repository';

vi.mock('../../../../../../infra/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('../../../../../../infra/repositories/tenant.repository', () => ({
  tenantRepository: {
    getTenantById: vi.fn(),
    updateTenantTimezone: vi.fn(),
  },
}));

vi.mock('../../../../../../infra/repositories/admin-audit-log.repository', () => ({
  adminAuditLogRepository: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

function makeRequest(pathname: string, options?: { body?: unknown; cookie?: string }) {
  return {
    nextUrl: new URL(`http://localhost${pathname}`),
    headers: new Headers(options?.cookie ? { cookie: options.cookie } : undefined),
    cookies: {
      get: vi.fn((name: string) => {
        if (name !== 'condstore_session' || !options?.cookie) return undefined;
        return { value: 'x' };
      }),
    },
    json: vi.fn().mockResolvedValue(options?.body ?? {}),
  } as never;
}

describe('PUT /api/tenants/[tenantId]/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-1',
      email: 'admin@example.com',
      tenantId: 'tenant-1',
      role: 'admin',
      sv: 1,
    });

    vi.mocked(tenantRepository.getTenantById).mockResolvedValue({
      id: 'tenant-1',
      name: 'Tenant 1',
      twilioNumber: 'whatsapp:+5511999999999',
      timezone: 'America/Sao_Paulo',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      plan: null,
      planStatus: null,
      planCurrentPeriodEnd: null,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
    } as never);
    vi.mocked(tenantRepository.updateTenantTimezone).mockResolvedValue(undefined);
  });

  it('returns 401 when request has no valid session cookie', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await PUT(makeRequest('/api/tenants/tenant-1/settings'));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' });
    expect(tenantRepository.updateTenantTimezone).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admin role', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-2',
      email: 'operator@example.com',
      tenantId: 'tenant-1',
      role: 'operator',
      sv: 1,
    });

    const response = await PUT(
      makeRequest('/api/tenants/tenant-1/settings', {
        cookie: 'condstore_session=x',
        body: { timezone: 'America/Sao_Paulo' },
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'FORBIDDEN' });
    expect(tenantRepository.updateTenantTimezone).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid timezone', async () => {
    const response = await PUT(
      makeRequest('/api/tenants/tenant-1/settings', {
        cookie: 'condstore_session=x',
        body: { timezone: 'Invalid/Timezone' },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
      },
    });
    expect(tenantRepository.updateTenantTimezone).not.toHaveBeenCalled();
  });

  it('returns 200 and updates timezone for admin', async () => {
    const response = await PUT(
      makeRequest('/api/tenants/tenant-1/settings', {
        cookie: 'condstore_session=x',
        body: { timezone: 'America/Sao_Paulo' },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      tenantId: 'tenant-1',
      timezone: 'America/Sao_Paulo',
      updated: true,
    });
    expect(tenantRepository.updateTenantTimezone).toHaveBeenCalledWith('tenant-1', 'America/Sao_Paulo');
    expect(adminAuditLogRepository.log).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      userId: 'user-1',
      action: 'tenant.set_timezone',
    }));
  });
});
