import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';
import { getSessionUser } from '../../../../infra/auth/session';
import { analyticsService } from '../../../../modules/analytics/analytics.service';
import { rateLimiter } from '../../../../infra/security/rate-limiter';

vi.mock('../../../../infra/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('../../../../modules/analytics/analytics.service', () => ({
  analyticsService: {
    logEvent: vi.fn(),
  },
}));

vi.mock('../../../../infra/repositories/attribution-click.repository', () => ({
  attributionClickRepository: {
    getByToken: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../../../infra/security/rate-limiter', () => ({
  rateLimiter: {
    limit: vi.fn(),
  },
  applyRateLimitHeaders: (response: Response, decision: { limit: number; remaining: number; resetAt: number }) => {
    response.headers.set('x-ratelimit-limit', String(decision.limit));
    response.headers.set('x-ratelimit-remaining', String(decision.remaining));
    response.headers.set('x-ratelimit-reset', String(decision.resetAt));
    return response;
  },
  hashRateLimitKeyForLog: vi.fn(() => 'events-key-hash'),
}));

function makeRequest(body: unknown, cookieHeader?: string) {
  const rawBody = JSON.stringify(body);
  const headers = new Headers({
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0 Test',
    'x-forwarded-for': '203.0.113.10',
  });
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  return {
    method: 'POST',
    url: 'http://localhost/api/events',
    nextUrl: new URL('http://localhost/api/events'),
    headers,
    cookies: {
      get: (name: string) => {
        if (name === 'condstore_attr' && cookieHeader?.includes('condstore_attr=')) {
          const token = cookieHeader.split('condstore_attr=')[1]?.split(';')[0];
          return token ? { value: token } : undefined;
        }
        if (name === 'condstore_anon') return undefined;
        return undefined;
      },
    },
    text: vi.fn().mockResolvedValue(rawBody),
  } as never;
}

describe('POST /api/events abuse hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
      tenantId: 'tenant-1',
      role: 'operator',
      sv: 1,
    });
    vi.mocked(analyticsService.logEvent).mockResolvedValue(undefined);
    vi.mocked(rateLimiter.limit).mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
      limit: 60,
    });
  });

  it('allows requests under limit and blocks when exceeded with 429 + headers', async () => {
    vi.mocked(rateLimiter.limit)
      .mockResolvedValueOnce({ allowed: true, remaining: 59, resetAt: 1000, limit: 60 })
      .mockResolvedValueOnce({ allowed: true, remaining: 58, resetAt: 1000, limit: 60 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: 2000, limit: 60 });

    const body = { event: 'landing_view', path: '/', props: { source: 'home' } };

    const r1 = await POST(makeRequest(body, 'condstore_attr=ref_123'));
    const r2 = await POST(makeRequest(body, 'condstore_attr=ref_123'));
    const r3 = await POST(makeRequest(body, 'condstore_attr=ref_123'));
    const payload3 = await r3.json();

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);
    expect(r3.headers.get('x-ratelimit-limit')).toBe('60');
    expect(r3.headers.get('x-ratelimit-remaining')).toBe('0');
    expect(r3.headers.get('x-ratelimit-reset')).toBe('2000');
    expect(payload3).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED' },
    });
  });
});

