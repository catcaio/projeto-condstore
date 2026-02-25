import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as postRollupDaily } from '../rollup-daily/route';
import { POST as postRollupBackfill } from '../rollup-backfill/route';
import { POST as postCleanupRetention } from '../cleanup-retention/route';
import { getInternalExportTokenOrThrow, isInternalTokenAuthorized } from '../../../../../infra/config/internal-token';
import { adminAuditLogRepository } from '../../../../../infra/repositories/admin-audit-log.repository';
import { runDailyMetricsRollup, runRollupBackfill } from '../../../../../modules/metrics/rollup-daily.service';
import { runRetentionCleanup } from '../../../../../modules/metrics/retention-cleanup.service';

vi.mock('../../../../../infra/config/internal-token', () => ({
  getInternalExportTokenOrThrow: vi.fn(),
  isInternalTokenAuthorized: vi.fn(),
}));

vi.mock('@/infra/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../../../modules/metrics/rollup-daily.service', () => ({
  runDailyMetricsRollup: vi.fn(),
  runRollupBackfill: vi.fn(),
}));

vi.mock('../../../../../modules/metrics/retention-cleanup.service', () => ({
  runRetentionCleanup: vi.fn(),
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
    vi.mocked(getInternalExportTokenOrThrow).mockReturnValue('internal-test-token');
    vi.mocked(isInternalTokenAuthorized).mockReturnValue(true);
    vi.mocked(runDailyMetricsRollup).mockResolvedValue({
      day: '2026-02-24',
      rowsWritten: 3,
      skippedTenants: 0,
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
  });

  it('requires internal token on all job endpoints', async () => {
    vi.mocked(isInternalTokenAuthorized).mockReturnValue(false);

    const [rollupRes, backfillRes, cleanupRes] = await Promise.all([
      postRollupDaily(makeRequest('http://localhost/api/internal/jobs/rollup-daily') as never),
      postRollupBackfill(makeRequest('http://localhost/api/internal/jobs/rollup-backfill', undefined, { from: '2026-02-01', to: '2026-02-02' }) as never),
      postCleanupRetention(makeRequest('http://localhost/api/internal/jobs/cleanup-retention') as never),
    ]);

    for (const res of [rollupRes, backfillRes, cleanupRes]) {
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

    expect(rollupRes.status).toBe(200);
    expect(backfillRes.status).toBe(200);
    expect(cleanupRes.status).toBe(200);
    expect(vi.mocked(runDailyMetricsRollup)).toHaveBeenCalled();
    expect(vi.mocked(runRollupBackfill)).toHaveBeenCalled();
    expect(vi.mocked(runRetentionCleanup)).toHaveBeenCalled();
    expect(vi.mocked(adminAuditLogRepository.log)).toHaveBeenCalledWith(expect.objectContaining({
      action: 'ops.rollup_backfill',
    }));
    expect(vi.mocked(adminAuditLogRepository.log)).toHaveBeenCalledWith(expect.objectContaining({
      action: 'ops.cleanup_retention',
    }));
  });
});
