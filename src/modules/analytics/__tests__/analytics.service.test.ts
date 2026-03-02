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
    expect(valuesMock.mock.calls[0][0].payloadJson.props).toBeNull();
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
    expect(valuesMock.mock.calls[0][0].payloadJson.props).toStrictEqual({});
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
    expect(valuesMock.mock.calls[0][0].payloadJson.props).toStrictEqual({ source: 'hero_cta' });
  });

  it('persists attribution fields when provided', async () => {
    const { analyticsService } = await import('../analytics.service');

    await analyticsService.logEvent({
      tenantId: 'tenant-1',
      anonId: 'anon-1',
      event: 'landing_view',
      path: '/',
      attribution: {
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'summer',
        refToken: 'ref-123',
        clickId: 'gclid-1',
      },
    });

    expect(valuesMock).toHaveBeenCalledTimes(1);
    expect(valuesMock.mock.calls[0][0].payloadJson).toMatchObject({
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'summer',
    });
    expect(valuesMock.mock.calls[0][0].attributionId).toBe('gclid-1');
  });
});
