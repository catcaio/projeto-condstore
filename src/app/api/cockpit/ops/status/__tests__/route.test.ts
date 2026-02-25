import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';
import { getSessionUser } from '../../../../../../infra/auth/session';
import { getDb } from '../../../../../../infra/db';
import { redisClient } from '../../../../../../infra/redis.client';
import { tenantRepository } from '../../../../../../infra/repositories/tenant.repository';
import { metricsRollupStatusRepository } from '../../../../../../modules/metrics/metrics-rollup-status.repository';

const mockExecute = vi.fn();

vi.mock('../../../../../../infra/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('../../../../../../infra/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('../../../../../../infra/redis.client', () => ({
  redisClient: {
    isAvailable: vi.fn().mockReturnValue(false),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../../../../../infra/repositories/tenant.repository', () => ({
  tenantRepository: {
    getTenantById: vi.fn(),
  },
}));

vi.mock('../../../../../../modules/metrics/metrics-rollup-status.repository', () => ({
  metricsRollupStatusRepository: {
    getByTenant: vi.fn(),
  },
}));

vi.mock('../../../../../../infra/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

function makeRequest(url = 'http://localhost/api/cockpit/ops/status') {
  return {
    nextUrl: new URL(url),
    headers: new Headers(),
    cookies: { get: vi.fn() },
  } as never;
}

describe('GET /api/cockpit/ops/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
    vi.mocked(getDb).mockResolvedValue({ execute: mockExecute } as never);
    vi.mocked(redisClient.isAvailable).mockReturnValue(false);
    vi.mocked(redisClient.ping).mockResolvedValue(true);
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
      createdAt: new Date('2026-02-01T00:00:00Z'),
    } as never);
    vi.mocked(metricsRollupStatusRepository.getByTenant).mockResolvedValue({
      tenantId: 'tenant-1',
      lastDayProcessed: '2026-02-24',
      lastRunAt: new Date('2026-02-25T03:00:00Z'),
      lastDurationMs: 123,
      lastRowsWritten: 8,
      status: 'ok',
      lastErrorCode: null,
    } as never);
    mockExecute.mockResolvedValue([[], []]);
  });

  it('returns 401 without session', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(body).toMatchObject({ ok: false, error: { code: 'AUTH_REQUIRED' } });
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-2',
      email: 'operator@example.com',
      tenantId: 'tenant-1',
      role: 'operator',
      sv: 1,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('returns ops status for admin', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(body).toMatchObject({
      tenantId: 'tenant-1',
      timezone: 'America/Sao_Paulo',
      db_ok: true,
      redis_ok: true,
      rollup_status: {
        last_day_processed: '2026-02-24',
        last_duration_ms: 123,
        last_rows_written: 8,
        status: 'ok',
      },
    });
    expect(metricsRollupStatusRepository.getByTenant).toHaveBeenCalledWith('tenant-1');
  });
});
