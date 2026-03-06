import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as postRollupDaily } from '../rollup-daily/route';
import { POST as postRollupBackfill } from '../rollup-backfill/route';
import { POST as postCleanupRetention } from '../cleanup-retention/route';
import { POST as postBackfillPhone } from '../backfill-phone/route';
import { requireInternalToken } from '../../../../../infra/auth/tenant-route-guard';
import { adminAuditLogRepository } from '../../../../../infra/repositories/admin-audit-log.repository';
import { runDailyMetricsRollup, runRollupBackfill } from '../../../../../modules/metrics/rollup-daily.service';
import { runRetentionCleanup } from '../../../../../modules/metrics/retention-cleanup.service';
import { backfillPhonePii } from '../../../../../modules/jobs/backfillPhonePii';

vi.mock('../../../../../infra/auth/tenant-route-guard', () => ({
  requireInternalToken: vi.fn(),
}));

vi.mock('@/infra/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/infra/distributed-lock', () => ({
  withDistributedLock: vi.fn(async (key, ttl, handler) => handler()),
}));

vi.mock('../../../../../modules/metrics/rollup-daily.service', () => ({
  runDailyMetricsRollup: vi.fn(),
  runRollupBackfill: vi.fn(),
}));

vi.mock('../../../../../modules/metrics/retention-cleanup.service', () => ({
  runRetentionCleanup: vi.fn(),
}));

vi.mock('../../../../../modules/jobs/backfillPhonePii', () => ({
  backfillPhonePii: vi.fn(),
}));

vi.mock('../../../../../infra/repositories/admin-audit-log.repository', () => ({
  adminAuditLogRepository: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../../../infra/log/logger', () => ({
  structuredLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function makeRequest(url: string, token?: string, body?: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      ...(token ? { 'x-internal-token': token } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe('internal jobs RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireInternalToken).mockReturnValue({ ok: true as const } as any);
    vi.mocked(runDailyMetricsRollup).mockResolvedValue({
      day: '2026-02-24',
      rowsWritten: 3,
      skippedTenants: 0,
      failedTenants: 0,
      errors: [],
      lockBusy: false,
      durationMs: 10,
    });
    vi.mocked(runRollupBackfill).mockResolvedValue({
      from: '2026-02-01',
      to: '2026-02-03',
      daysProcessed: 3,
      rowsWritten: 5,
      skippedDays: 0,
      perDay: [],
      durationMs: 30,
    });
    vi.mocked(runRetentionCleanup).mockResolvedValue({
      tables: [],
      totalDeleted: 12,
      durationMs: 40,
    });
    vi.mocked(backfillPhonePii).mockResolvedValue({
      batchSize: 100,
      maxBatches: 5,
      batchesRun: 1,
      messagesUpdated: 2,
      funnelEventsUpdated: 1,
      skippedRows: 0,
      hasMore: false,
      durationMs: 15,
    });
  });

  it('requires internal token on all job endpoints', async () => {
    vi.mocked(requireInternalToken).mockReturnValue({
      ok: false as const,
      // The routes themselves now return the specific errorResponse payload, but the guard's response isn't used directly here except when ok is false. 
      // Actually wait, our routes do: if (!authResult.ok) return errorResponse(...)
      // So the guard's response isn't even returned directly in these job scripts. It just needs to return ok: false.
    } as any);

    const [rollupRes, backfillRes, cleanupRes, piiBackfillRes] = await Promise.all([
      postRollupDaily(makeRequest('http://localhost/api/internal/jobs/rollup-daily') as never),
      postRollupBackfill(makeRequest('http://localhost/api/internal/jobs/rollup-backfill', undefined, { from: '2026-02-01', to: '2026-02-02' }) as never),
      postCleanupRetention(makeRequest('http://localhost/api/internal/jobs/cleanup-retention') as never),
      postBackfillPhone(makeRequest('http://localhost/api/internal/jobs/backfill-phone') as never),
    ]);

    for (const res of [rollupRes, backfillRes, cleanupRes, piiBackfillRes]) {
      const body = await res.json();
      expect(res.status).toBe(401);
      expect(res.headers.get('x-request-id')).toBeTruthy();
      expect(body).toMatchObject({
        ok: false,
        error: { code: 'AUTH_REQUIRED' },
      });
    }
  });

  it('runs jobs when authorized', async () => {
    const rollupRes = await postRollupDaily(
      makeRequest('http://localhost/api/internal/jobs/rollup-daily', 'internal-test-token', { day: '2026-02-24' }) as never,
    );
    const backfillRes = await postRollupBackfill(
      makeRequest('http://localhost/api/internal/jobs/rollup-backfill', 'internal-test-token', { from: '2026-02-01', to: '2026-02-03' }) as never,
    );
    const cleanupRes = await postCleanupRetention(
      makeRequest('http://localhost/api/internal/jobs/cleanup-retention', 'internal-test-token') as never,
    );
    const piiBackfillRes = await postBackfillPhone(
      makeRequest('http://localhost/api/internal/jobs/backfill-phone', 'internal-test-token', { batchSize: 100 }) as never,
    );

    expect(rollupRes.status).toBe(200);
    expect(backfillRes.status).toBe(200);
    expect(cleanupRes.status).toBe(200);
    expect(piiBackfillRes.status).toBe(200);
    expect(vi.mocked(runDailyMetricsRollup)).toHaveBeenCalled();
    expect(vi.mocked(runRollupBackfill)).toHaveBeenCalled();
    expect(vi.mocked(runRetentionCleanup)).toHaveBeenCalled();
    expect(vi.mocked(backfillPhonePii)).toHaveBeenCalledWith(expect.objectContaining({
      batchSize: 100,
    }));
    expect(vi.mocked(adminAuditLogRepository.log)).toHaveBeenCalledWith(expect.objectContaining({
      action: 'ops.rollup_backfill',
    }));
    expect(vi.mocked(adminAuditLogRepository.log)).toHaveBeenCalledWith(expect.objectContaining({
      action: 'ops.cleanup_retention',
    }));
    expect(vi.mocked(adminAuditLogRepository.log)).toHaveBeenCalledWith(expect.objectContaining({
      action: 'ops.backfill_phone_pii',
    }));
  });
});
