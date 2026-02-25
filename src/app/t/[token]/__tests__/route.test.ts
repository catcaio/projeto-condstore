import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';
import { attributionClickRepository } from '../../../../infra/repositories/attribution-click.repository';
import { rateLimiter } from '../../../../infra/security/rate-limiter';

vi.mock('../../../../infra/repositories/attribution-click.repository', () => ({
  attributionClickRepository: {
    getByToken: vi.fn(),
    upsertByToken: vi.fn().mockResolvedValue(undefined),
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
  hashRateLimitKeyForLog: vi.fn(() => 'hash-key'),
}));

describe('GET /t/[token]', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TRACKING_REDIRECT_URL = 'https://wa.me/5511999999999';
    process.env.TRACKING_REDIRECT_MODE = 'whatsapp';
    vi.mocked(rateLimiter.limit).mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: Date.now() + 60_000,
      limit: 30,
    });
    vi.mocked(attributionClickRepository.getByToken).mockResolvedValue({
      id: 'click-1',
      token: 'ref_123',
    } as never);
  });

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
  });

  it('redirects 302 and records attribution click with hashed ua/ip', async () => {
    const request = {
      nextUrl: new URL('http://localhost/t/ref_123?utm_source=google&utm_campaign=promo&gclid=abc123&landing_url=https%3A%2F%2Fsite.test%2Fpromo'),
      headers: new Headers({
        'user-agent': 'Mozilla/5.0 Test',
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
      }),
    } as never;

    const response = await GET(request, { params: Promise.resolve({ token: 'ref_123' }) });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('https://wa.me/5511999999999');
    expect(response.headers.get('location')).toContain('text=%23t%3Dref_123');
    expect(attributionClickRepository.upsertByToken).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'ref_123',
        utmSource: 'google',
        utmCampaign: 'promo',
        clickId: 'abc123',
        landingUrl: 'https://site.test/promo',
        userAgentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        ipHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );

    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('condstore_attr=ref_123');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie).toContain('Max-Age=2592000');
  });

  it('returns 400 VALIDATION_ERROR for invalid token format', async () => {
    const request = {
      nextUrl: new URL('http://localhost/t/!!bad'),
      headers: new Headers({ 'x-forwarded-for': '203.0.113.10' }),
    } as never;

    const response = await GET(request, { params: Promise.resolve({ token: '!!bad' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('applies tracking rate limit and returns 429 with headers after allowed requests', async () => {
    vi.mocked(rateLimiter.limit)
      .mockResolvedValueOnce({ allowed: true, remaining: 29, resetAt: 1000, limit: 30 })
      .mockResolvedValueOnce({ allowed: true, remaining: 28, resetAt: 1000, limit: 30 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: 2000, limit: 30 });

    const makeReq = () => ({
      nextUrl: new URL('http://localhost/t/ref_123?utm_source=google'),
      headers: new Headers({
        'user-agent': 'Mozilla/5.0 Test',
        'x-forwarded-for': '203.0.113.10',
      }),
    } as never);

    const first = await GET(makeReq(), { params: Promise.resolve({ token: 'ref_123' }) });
    const second = await GET(makeReq(), { params: Promise.resolve({ token: 'ref_123' }) });
    const third = await GET(makeReq(), { params: Promise.resolve({ token: 'ref_123' }) });
    const thirdBody = await third.json();

    expect(first.status).toBe(302);
    expect(second.status).toBe(302);
    expect(third.status).toBe(429);
    expect(third.headers.get('x-ratelimit-limit')).toBe('30');
    expect(third.headers.get('x-ratelimit-remaining')).toBe('0');
    expect(third.headers.get('x-ratelimit-reset')).toBe('2000');
    expect(thirdBody).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED' },
    });
  });

  it('sets secure cookie flag in production', async () => {
    process.env.NODE_ENV = 'production';

    const request = {
      nextUrl: new URL('http://localhost/t/ref_123?utm_source=google'),
      headers: new Headers({
        'user-agent': 'Mozilla/5.0 Test',
        'x-forwarded-for': '203.0.113.10',
      }),
    } as never;

    const response = await GET(request, { params: Promise.resolve({ token: 'ref_123' }) });
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(302);
    expect(setCookie).toContain('Secure');
  });
});
