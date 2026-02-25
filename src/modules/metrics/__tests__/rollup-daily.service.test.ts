import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runDailyMetricsRollup, runRollupBackfill } from '../rollup-daily.service';
import { getDb } from '../../../infra/db';
import { metricsDailyRepository } from '../metrics-daily.repository';
import { tenantRepository } from '../../../infra/repositories/tenant.repository';
import { metricsRollupStatusRepository } from '../metrics-rollup-status.repository';
import { acquireLock, releaseLock } from '../../../infra/security/distributed-lock';

const mockExecute = vi.fn();

vi.mock('../../../infra/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('../metrics-daily.repository', () => ({
  metricsDailyRepository: {
    upsertDailyRows: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../metrics-rollup-status.repository', () => ({
  metricsRollupStatusRepository: {
    upsertSuccess: vi.fn().mockResolvedValue(undefined),
    upsertError: vi.fn().mockResolvedValue(undefined),
    markLockBusy: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../infra/security/distributed-lock', () => ({
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
}));

vi.mock('../../../infra/repositories/tenant.repository', () => ({
  tenantRepository: {
    getAllTenants: vi.fn(),
    getTenantById: vi.fn(),
  },
}));

vi.mock('../../../infra/log/logger', () => ({
  structuredLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('rollup-daily.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
    vi.mocked(getDb).mockResolvedValue({ execute: mockExecute } as never);
    const tenant = {
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
    };
    vi.mocked(tenantRepository.getAllTenants).mockResolvedValue([tenant] as never);
    vi.mocked(tenantRepository.getTenantById).mockResolvedValue(tenant as never);
    vi.mocked(acquireLock).mockResolvedValue({ acquired: true, token: 'lock-token' });
    vi.mocked(releaseLock).mockResolvedValue(undefined);
  });

  it('aggregates daily metrics and upserts rows with correct counters', async () => {
    mockExecute
      .mockResolvedValueOnce([[
        { tenantId: 'tenant-1', utmSource: 'google', utmCampaign: 'camp_a', count: '2' },
        { tenantId: 'tenant-1', utmSource: null, utmCampaign: null, count: '1' },
      ], []]) // public_events
      .mockResolvedValueOnce([[
        { tenantId: 'tenant-1', utmSource: 'google', utmCampaign: 'camp_a', count: '1' },
      ], []]) // funnel_started
      .mockResolvedValueOnce([[
        { tenantId: 'tenant-1', utmSource: 'google', utmCampaign: 'camp_a', count: '3' },
      ], []]) // freight_simulation_logs
      .mockResolvedValueOnce([[
        { tenantId: 'tenant-1', utmSource: 'google', utmCampaign: 'camp_a', count: '4' },
      ], []]) // click_tokens
      .mockResolvedValueOnce([[
        { tenantId: 'tenant-1', utmSource: 'google', utmCampaign: 'camp_a', count: '2' },
        { tenantId: 'tenant-1', utmSource: null, utmCampaign: null, count: '1' },
      ], []]); // consumed_tokens

    const result = await runDailyMetricsRollup({
      day: '2026-02-20',
      requestId: 'req-rollup-1',
    });

    expect(result.day).toBe('2026-02-20');
    expect(result.rowsWritten).toBe(2);
    expect(result.skippedTenants).toBe(0);
    expect(result.lockBusy).toBe(false);
    expect(metricsDailyRepository.upsertDailyRows).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          tenantId: 'tenant-1',
          dayDate: '2026-02-20',
          utmSource: 'google',
          utmCampaign: 'camp_a',
          totalEvents: 2,
          funnelStarted: 1,
          freightSimulations: 3,
          clickTokens: 4,
          consumedTokens: 2,
        }),
        expect.objectContaining({
          tenantId: 'tenant-1',
          dayDate: '2026-02-20',
          utmSource: '(none)',
          utmCampaign: '(none)',
          totalEvents: 1,
          funnelStarted: 0,
          freightSimulations: 0,
          clickTokens: 0,
          consumedTokens: 1,
        }),
      ]),
    );
    expect(metricsRollupStatusRepository.upsertSuccess).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      day: '2026-02-20',
      rowsWritten: 2,
    }));
    expect(acquireLock).toHaveBeenCalledWith('rollup:lock:tenant-1:2026-02-20', 600);
    expect(releaseLock).toHaveBeenCalledWith('rollup:lock:tenant-1:2026-02-20', 'lock-token');
    expect(metricsRollupStatusRepository.upsertError).not.toHaveBeenCalled();
  });

  it('backfills up to 31 days and rejects larger ranges', async () => {
    mockExecute.mockResolvedValue([[], []]);

    const ok = await runRollupBackfill({
      from: '2026-02-01',
      to: '2026-02-03',
      requestId: 'req-backfill-1',
    });
    expect(ok.daysProcessed).toBe(3);
    expect(ok.skippedDays).toBe(0);

    await expect(runRollupBackfill({
      from: '2026-01-01',
      to: '2026-02-15',
      requestId: 'req-backfill-2',
    })).rejects.toThrow('range_too_large');
  });

  it('writes error status when a tenant rollup query fails', async () => {
    mockExecute.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'ER_TEST_FAIL' }));

    await expect(runDailyMetricsRollup({
      day: '2026-02-20',
      requestId: 'req-rollup-error',
    })).rejects.toThrow('boom');

    expect(metricsRollupStatusRepository.upsertError).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      errorCode: 'ER_TEST_FAIL',
    }));
  });

  it('skips tenant when lock is busy and marks lock-busy status', async () => {
    vi.mocked(acquireLock).mockResolvedValueOnce({ acquired: false, token: 'busy-token' });

    const result = await runDailyMetricsRollup({
      day: '2026-02-20',
      requestId: 'req-rollup-lock',
      tenantId: 'tenant-1',
    });

    expect(result.rowsWritten).toBe(0);
    expect(result.skippedTenants).toBe(1);
    expect(result.lockBusy).toBe(true);
    expect(metricsDailyRepository.upsertDailyRows).not.toHaveBeenCalled();
    expect(metricsRollupStatusRepository.markLockBusy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
    }));
    expect(releaseLock).not.toHaveBeenCalled();
  });

  it('backfill counts skippedDays when a day is lock-busy and continues', async () => {
    mockExecute.mockResolvedValue([[], []]);
    vi.mocked(acquireLock).mockImplementation(async (key: string) => {
      if (key.endsWith(':2026-02-02')) {
        return { acquired: false, token: 'lock-busy' };
      }
      return { acquired: true, token: 'lock-ok' };
    });

    const result = await runRollupBackfill({
      from: '2026-02-01',
      to: '2026-02-03',
      requestId: 'req-backfill-lock-busy',
    });

    expect(result.daysProcessed).toBe(3);
    expect(result.skippedDays).toBe(1);
    expect(result.perDay.map((d) => d.day)).toEqual(['2026-02-01', '2026-02-02', '2026-02-03']);
  });
});
