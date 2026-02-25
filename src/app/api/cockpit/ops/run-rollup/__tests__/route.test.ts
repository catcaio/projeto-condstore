import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';
import { getSessionUser } from '../../../../../../infra/auth/session';
import { adminAuditLogRepository } from '../../../../../../infra/repositories/admin-audit-log.repository';
import { tenantRepository } from '../../../../../../infra/repositories/tenant.repository';
import { redisClient } from '../../../../../../infra/redis.client';
import { runDailyMetricsRollup } from '../../../../../../modules/metrics/rollup-daily.service';
import { metricsRollupStatusRepository } from '../../../../../../modules/metrics/metrics-rollup-status.repository';

vi.mock('../../../../../../infra/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('../../../../../../infra/repositories/admin-audit-log.repository', () => ({
  adminAuditLogRepository: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../../../../infra/repositories/tenant.repository', () => ({
  tenantRepository: {
    getTenantById: vi.fn(),
  },
}));

vi.mock('../../../../../../infra/redis.client', () => ({
  redisClient: {
    del: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../../../../modules/metrics/rollup-daily.service', () => ({
  runDailyMetricsRollup: vi.fn(),
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

function makeRequest(options?: { body?: unknown; rawBody?: string }) {
  const rawBody = options?.rawBody ?? (options?.body !== undefined ? JSON.stringify(options.body) : '');
  return {
    headers: new Headers(options?.body !== undefined ? { 'content-type': 'application/json' } : undefined),
    nextUrl: new URL('http://localhost/api/cockpit/ops/run-rollup'),
    cookies: { get: vi.fn() },
    text: vi.fn().mockResolvedValue(rawBody),
  } as never;
}

describe('POST /api/cockpit/ops/run-rollup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-1',
      email: 'admin@example.com',
      tenantId: 'tenant-1',
      role: 'admin',
      sv: 1,
    });
    vi.mocked(runDailyMetricsRollup).mockResolvedValue({
      day: '2026-02-24',
      rowsWritten: 7,
      skippedTenants: 0,
      failedTenants: 0,
      errors: [],
      lockBusy: false,
      durationMs: 55,
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
      lastRunAt: new Date('2026-02-25T03:01:00Z'),
      lastDurationMs: 55,
      lastRowsWritten: 7,
      status: 'ok',
      lastErrorCode: null,
    } as never);
  });

  it('returns 401 without session', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await POST(makeRequest({ body: {} }));
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
    const res = await POST(makeRequest({ body: {} }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('returns 200, runs tenant rollup, and writes audit log', async () => {
    const res = await POST(makeRequest({ body: { day: '2026-02-24' } }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(vi.mocked(runDailyMetricsRollup)).toHaveBeenCalledWith(expect.objectContaining({
      day: '2026-02-24',
      tenantId: 'tenant-1',
    }));
    expect(vi.mocked(adminAuditLogRepository.log)).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      userId: 'user-1',
      action: 'ops.run_rollup',
    }));
    expect(vi.mocked(metricsRollupStatusRepository.getByTenant)).toHaveBeenCalledWith('tenant-1');
    expect(body).toMatchObject({
      ok: true,
      tenantId: 'tenant-1',
      timezone: 'America/Sao_Paulo',
      result: {
        day: '2026-02-24',
        rowsWritten: 7,
      },
      rollup_status: {
        last_day_processed: '2026-02-24',
        last_rows_written: 7,
        status: 'ok',
      },
    });
  });

  it('returns 409 when tenant/day lock is busy', async () => {
    vi.mocked(runDailyMetricsRollup).mockResolvedValueOnce({
      day: '2026-02-24',
      rowsWritten: 0,
      skippedTenants: 1,
      failedTenants: 0,
      errors: [],
      lockBusy: true,
      durationMs: 5,
    });

    const res = await POST(makeRequest({ body: { day: '2026-02-24' } }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(res.headers.get('retry-after')).toBe('60');
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: 'LOCK_BUSY',
      },
    });
    expect(vi.mocked(adminAuditLogRepository.log)).not.toHaveBeenCalled();
  });
});
