import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';
import { getSessionUser } from '../../../../../../infra/auth/session';
import { requireActivePlan } from '@/modules/billing';
import { getDb } from '../../../../../../infra/db';
import { metricsDailyRepository } from '../../../../../../modules/metrics/metrics-daily.repository';
import { tenantRepository } from '../../../../../../infra/repositories/tenant.repository';
import { redisClient } from '../../../../../../infra/redis.client';
import { isDevRuntime, isQaAutomation } from '../../../../../../infra/env/devOnly';

const mockExecute = vi.fn();

vi.mock('@/modules/billing', () => ({
  requireActivePlan: vi.fn(),
}));

vi.mock('../../../../../../infra/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('../../../../../../infra/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('../../../../../../modules/metrics/metrics-daily.repository', () => ({
  metricsDailyRepository: {
    queryAcquisitionBuckets: vi.fn(),
    isUnavailableError: vi.fn(() => false),
  },
}));

vi.mock('../../../../../../infra/redis.client', () => ({
  redisClient: {
    isAvailable: vi.fn().mockReturnValue(false),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../../../../infra/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('../../../../../../infra/env/devOnly', () => ({
  isDevRuntime: vi.fn(() => true),
  isQaAutomation: vi.fn(() => false),
}));

vi.mock('../../../../../../infra/repositories/tenant.repository', () => ({
  tenantRepository: {
    getTenantById: vi.fn(),
  },
}));

describe('GET /api/cockpit/metrics/acquisition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-1',
      email: 'admin@example.com',
      tenantId: 'tenant-1',
      role: 'admin',
      sv: 1,
    });
    vi.mocked(requireActivePlan).mockResolvedValue({ tenantId: 'tenant-1' });
    vi.mocked(getDb).mockResolvedValue({ execute: mockExecute } as never);
    vi.mocked(metricsDailyRepository.queryAcquisitionBuckets).mockResolvedValue([]);
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
    vi.mocked(redisClient.isAvailable).mockReturnValue(false);
    vi.mocked(redisClient.get).mockResolvedValue(null);
    vi.mocked(redisClient.set).mockResolvedValue(undefined);
  });

  it('returns grouped acquisition metrics with conversion rates', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ bucket: 'camp_a', count: '10' }, { bucket: '(none)', count: '2' }], []]) // clicks
      .mockResolvedValueOnce([[{ bucket: 'camp_a', count: '4' }, { bucket: '(none)', count: '1' }], []])  // consumed
      .mockResolvedValueOnce([[{ bucket: 'camp_a', count: '30' }, { bucket: '(none)', count: '3' }], []]) // public events
      .mockResolvedValueOnce([[{ bucket: 'camp_a', count: '5' }, { bucket: '(none)', count: '1' }], []])  // funnel started
      .mockResolvedValueOnce([[{ bucket: 'camp_a', count: '2' }, { bucket: '(none)', count: '1' }], []]); // freight sims

    const res = await GET({
      nextUrl: new URL('http://localhost/api/cockpit/metrics/acquisition?groupBy=utm_campaign&window=30d'),
      headers: new Headers(),
    } as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(data).toMatchObject({
      window: '30d',
      groupBy: 'utm_campaign',
      totals: {
        total_click_tokens: 12,
        total_consumed_tokens: 5,
        total_events: 33,
        funnel_started: 6,
        freight_simulations: 3,
      },
    });

    expect(data.rows).toEqual([
      {
        key: 'camp_a',
        total_click_tokens: 10,
        total_consumed_tokens: 4,
        total_events: 30,
        funnel_started: 5,
        freight_simulations: 2,
        conversion_rate_1: 0.4,
        conversion_rate_2: 0.5,
      },
      {
        key: '(none)',
        total_click_tokens: 2,
        total_consumed_tokens: 1,
        total_events: 3,
        funnel_started: 1,
        freight_simulations: 1,
        conversion_rate_1: 0.5,
        conversion_rate_2: 1,
      },
    ]);
    expect(data.source).toBe('raw');
    expect(res.headers.get('x-metrics-source')).toBe('raw');
    expect(res.headers.get('x-metrics-timezone')).toBe('America/Sao_Paulo');
  });

  it('uses rollup table for 7d window when data exists', async () => {
    vi.mocked(isDevRuntime).mockReturnValue(false);
    vi.mocked(isQaAutomation).mockReturnValue(false);
    vi.mocked(metricsDailyRepository.queryAcquisitionBuckets).mockResolvedValue([
      {
        bucket: 'camp_rollup',
        total_click_tokens: '8',
        total_consumed_tokens: '3',
        total_events: '20',
        funnel_started: '4',
        freight_simulations: '2',
      },
      {
        bucket: '(none)',
        total_click_tokens: '2',
        total_consumed_tokens: '1',
        total_events: '5',
        funnel_started: '1',
        freight_simulations: '1',
      },
    ] as never);

    const res = await GET({
      nextUrl: new URL('http://localhost/api/cockpit/metrics/acquisition?groupBy=utm_campaign&window=7d'),
      headers: new Headers(),
    } as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('x-metrics-source')).toBe('rollup');
    expect(res.headers.get('x-metrics-timezone')).toBe('America/Sao_Paulo');
    expect(mockExecute).not.toHaveBeenCalled();
    expect(data).toMatchObject({
      source: 'rollup',
      totals: {
        total_click_tokens: 10,
        total_consumed_tokens: 4,
        total_events: 25,
        funnel_started: 5,
        freight_simulations: 3,
      },
    });
  });

  it('keeps rollup and raw responses coherent for a 7d dataset', async () => {
    vi.mocked(isDevRuntime).mockReturnValue(false);
    vi.mocked(isQaAutomation).mockReturnValue(false);
    vi.mocked(metricsDailyRepository.queryAcquisitionBuckets)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          bucket: 'google',
          total_click_tokens: '3',
          total_consumed_tokens: '2',
          total_events: '5',
          funnel_started: '2',
          freight_simulations: '1',
        },
        {
          bucket: '(none)',
          total_click_tokens: '1',
          total_consumed_tokens: '1',
          total_events: '2',
          funnel_started: '1',
          freight_simulations: '1',
        },
      ] as never);

    mockExecute
      .mockResolvedValueOnce([[{ bucket: 'google', count: '3' }, { bucket: '(none)', count: '1' }], []]) // clicks
      .mockResolvedValueOnce([[{ bucket: 'google', count: '2' }, { bucket: '(none)', count: '1' }], []]) // consumed
      .mockResolvedValueOnce([[{ bucket: 'google', count: '5' }, { bucket: '(none)', count: '2' }], []]) // events
      .mockResolvedValueOnce([[{ bucket: 'google', count: '2' }, { bucket: '(none)', count: '1' }], []]) // funnel
      .mockResolvedValueOnce([[{ bucket: 'google', count: '1' }, { bucket: '(none)', count: '1' }], []]); // freight

    const rawRes = await GET({
      nextUrl: new URL('http://localhost/api/cockpit/metrics/acquisition?groupBy=utm_source&window=7d'),
      headers: new Headers(),
    } as never);
    const rawData = await rawRes.json();

    const rollupRes = await GET({
      nextUrl: new URL('http://localhost/api/cockpit/metrics/acquisition?groupBy=utm_source&window=7d'),
      headers: new Headers(),
    } as never);
    const rollupData = await rollupRes.json();

    expect(rawData.source).toBe('raw');
    expect(rollupData.source).toBe('rollup');
    expect(rollupData.totals).toEqual(rawData.totals);
    expect(rollupData.buckets).toEqual(rawData.buckets);
  });

  it('includes timezone in cache key and response header', async () => {
    vi.mocked(redisClient.isAvailable).mockReturnValue(true);
    vi.mocked(metricsDailyRepository.queryAcquisitionBuckets).mockResolvedValue([]);
    mockExecute
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []]);

    const res = await GET({
      nextUrl: new URL('http://localhost/api/cockpit/metrics/acquisition?groupBy=utm_campaign&window=7d'),
      headers: new Headers(),
    } as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-metrics-timezone')).toBe('America/Sao_Paulo');
    expect(vi.mocked(redisClient.get)).toHaveBeenCalledWith(expect.stringContaining('tz=America_Sao_Paulo'));
    expect(vi.mocked(redisClient.set)).toHaveBeenCalledWith(
      expect.stringContaining('tz=America_Sao_Paulo'),
      expect.any(Object),
      60,
    );
  });
});
