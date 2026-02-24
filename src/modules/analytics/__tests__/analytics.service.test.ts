import { beforeEach, describe, expect, it, vi } from 'vitest';

const valuesMock = vi.fn();
const insertMock = vi.fn(() => ({ values: valuesMock }));
const getDbMock = vi.fn(async () => ({ insert: insertMock }));

vi.mock('../../../infra/db', () => ({
  getDb: getDbMock,
}));

describe('analyticsService.logEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends props as null when props is undefined', async () => {
    const { analyticsService } = await import('../analytics.service');

    await analyticsService.logEvent({
      tenantId: 'tenant-1',
      anonId: 'anon-1',
      event: 'landing_view',
      path: '/',
    });

    expect(valuesMock).toHaveBeenCalledTimes(1);
    expect(valuesMock.mock.calls[0][0].props).toBeNull();
  });

  it('sends props as null when props is empty object', async () => {
    const { analyticsService } = await import('../analytics.service');

    await analyticsService.logEvent({
      tenantId: 'tenant-1',
      anonId: 'anon-1',
      event: 'landing_view',
      path: '/',
      props: {},
    });

    expect(valuesMock).toHaveBeenCalledTimes(1);
    expect(valuesMock.mock.calls[0][0].props).toBeNull();
  });

  it('stringifies props when object has content', async () => {
    const { analyticsService } = await import('../analytics.service');

    await analyticsService.logEvent({
      tenantId: 'tenant-1',
      anonId: 'anon-1',
      event: 'landing_view',
      path: '/',
      props: { source: 'hero_cta' },
    });

    expect(valuesMock).toHaveBeenCalledTimes(1);
    expect(valuesMock.mock.calls[0][0].tenantId).toBe('tenant-1');
    expect(valuesMock.mock.calls[0][0].props).toBe(JSON.stringify({ source: 'hero_cta' }));
  });
});
