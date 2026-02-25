import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../route';
import { cleanupRetention } from '@/modules/jobs/cleanupRetention';

vi.mock('@/modules/jobs/cleanupRetention', () => ({
  cleanupRetention: vi.fn(),
}));

vi.mock('@/infra/log/logger', () => ({
  structuredLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('/api/cron/cleanup', () => {
  const originalCronToken = process.env.CRON_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_TOKEN = 'cron-secret';
    vi.mocked(cleanupRetention).mockResolvedValue({
      retentionDays: 90,
      durationMs: 12,
      deleted: {
        total: 3,
        tables: [{ table: 'public_events', count: 3, durationMs: 12 }],
      },
    });
  });

  afterEach(() => {
    if (originalCronToken === undefined) {
      delete process.env.CRON_TOKEN;
    } else {
      process.env.CRON_TOKEN = originalCronToken;
    }
  });

  it('returns 401 without x-vercel-cron header and without token', async () => {
    const response = await GET(new Request('http://localhost/api/cron/cleanup', {
      method: 'GET',
      headers: { 'x-request-id': 'req-cron-401' },
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('req-cron-401');
    expect(body).toEqual({ error: 'UNAUTHORIZED_CRON' });
    expect(vi.mocked(cleanupRetention)).not.toHaveBeenCalled();
  });

  it('returns 200 when token query is valid', async () => {
    const response = await GET(new Request('http://localhost/api/cron/cleanup?token=cron-secret', {
      method: 'GET',
      headers: { 'x-request-id': 'req-cron-token' },
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('req-cron-token');
    expect(body).toEqual({
      ok: true,
      retentionDays: 90,
      deleted: {
        total: 3,
        tables: [{ table: 'public_events', count: 3, durationMs: 12 }],
      },
    });
    expect(vi.mocked(cleanupRetention)).toHaveBeenCalledWith({ requestId: 'req-cron-token' });
  });

  it('returns 200 when x-vercel-cron header is present', async () => {
    const response = await POST(new Request('http://localhost/api/cron/cleanup', {
      method: 'POST',
      headers: {
        'x-request-id': 'req-cron-header',
        'x-vercel-cron': '1',
      },
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('req-cron-header');
    expect(body).toMatchObject({ ok: true, retentionDays: 90 });
    expect(vi.mocked(cleanupRetention)).toHaveBeenCalledWith({ requestId: 'req-cron-header' });
  });
});
