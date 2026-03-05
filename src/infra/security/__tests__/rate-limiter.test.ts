import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedis = vi.hoisted(() => ({
  isAvailable: vi.fn(),
  get: vi.fn(),
  ttl: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  set: vi.fn(),
}));

const mockStructuredLogger = vi.hoisted(() => ({
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
}));

const mockSha256Hex = vi.hoisted(() =>
  vi.fn((input: string | null | undefined) => (input ? '0123456789abcdef0123456789abcdef' : null)),
);

vi.mock('../../redis.client', () => ({
  redisClient: mockRedis,
}));

vi.mock('../../log/logger', () => ({
  structuredLogger: mockStructuredLogger,
}));

vi.mock('../../attribution/hash', () => ({
  sha256Hex: mockSha256Hex,
}));

import { RateLimiter, resetRateLimiterState } from '../rate-limiter';

describe('security rate-limiter redis failure hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-25T12:00:00.000Z'));
    resetRateLimiterState();

    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.RATE_LIMIT_FAIL_CLOSED;

    mockRedis.isAvailable.mockReturnValue(false);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.ttl.mockResolvedValue(-2);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(undefined);
    mockRedis.set.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    delete process.env.RATE_LIMIT_FAIL_CLOSED;
  });

  it('fails closed in production for critical scopes when redis is unavailable', async () => {
    const limiter = new RateLimiter();
    const now = Date.now();

    // Use a scope that is NOT in FAILOPEN_WITH_MEMORY_SCOPES (e.g. internal.ops)
    const result = await limiter.limit('internal.ops', '1.2.3.4:admin', {
      max: 5,
      windowSec: 60,
    });

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      resetAt: now + 60_000,
      limit: 5,
    });
    expect(mockStructuredLogger.error).toHaveBeenCalledWith(
      'rate_limiter_redis_failure_fail_closed',
      expect.objectContaining({
        eventType: 'rate_limiter',
        scope: 'internal.ops',
        keyHash: '0123456789abcdef',
        reason: 'redis_unavailable',
        rateLimitMode: 'fail_closed',
        sensitivity: 'critical',
      }),
    );

    const logContext = mockStructuredLogger.error.mock.calls[0]?.[1];
    expect(logContext).not.toHaveProperty('key');
    expect(JSON.stringify(logContext)).not.toContain('admin');
  });

  it('uses memory fallback for auth.login (failopen scope) when redis is unavailable', async () => {
    const limiter = new RateLimiter();

    const result = await limiter.limit('auth.login', '1.2.3.4:user@example.com', {
      max: 5,
      windowSec: 60,
    });

    // Should be allowed (memory fallback, first request)
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
    expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
      'rate_limiter_fallback_local_used',
      expect.objectContaining({
        eventType: 'rate_limiter',
        scope: 'auth.login',
        reason: 'redis_unavailable',
        rateLimitMode: 'failopen_memory',
        sensitivity: 'failopen_memory',
      }),
    );
    // Must NOT call fail_closed for auth.login
    expect(mockStructuredLogger.error).not.toHaveBeenCalledWith(
      'rate_limiter_redis_failure_fail_closed',
      expect.anything(),
    );
  });

  it('auth.login memory fallback still rate-limits after exceeding max', async () => {
    const limiter = new RateLimiter();

    // Exhaust the limit (5 requests)
    for (let i = 0; i < 5; i++) {
      await limiter.limit('auth.login', '1.2.3.4:brute', {
        max: 5,
        windowSec: 60,
      });
    }

    // 6th request should be blocked
    const result = await limiter.limit('auth.login', '1.2.3.4:brute', {
      max: 5,
      windowSec: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('uses memory fallback for public_safe scopes when redis is unavailable', async () => {
    const limiter = new RateLimiter();

    const result = await limiter.limit('cotacao_quotes', '1.2.3.4:user@example.com', {
      max: 30,
      windowSec: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
    expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
      'rate_limiter_fallback_local_used',
      expect.objectContaining({
        eventType: 'rate_limiter',
        scope: 'cotacao_quotes',
        rateLimitMode: 'failopen_memory',
        sensitivity: 'failopen_memory',
      }),
    );

    // Should NOT call fail_open log anymore
    expect(mockStructuredLogger.warn).not.toHaveBeenCalledWith(
      'rate_limiter_fallback_active',
      expect.anything(),
    );
  });

  it('fails closed in production for critical scopes when redis operation fails while available', async () => {
    mockRedis.isAvailable.mockReturnValue(true);
    mockRedis.incr.mockResolvedValue(0);
    mockRedis.get.mockResolvedValue(0);

    const limiter = new RateLimiter();
    const result = await limiter.limit('internal.ops', '1.2.3.4:admin', {
      max: 5,
      windowSec: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(mockStructuredLogger.error).toHaveBeenCalledWith(
      'rate_limiter_redis_failure_fail_closed',
      expect.objectContaining({
        eventType: 'rate_limiter',
        scope: 'internal.ops',
        keyHash: '0123456789abcdef',
        reason: 'redis_error',
        rateLimitMode: 'fail_closed',
        sensitivity: 'critical',
        errorName: 'Error',
      }),
    );
  });

  it('auth.login uses memory fallback even when redis errors (not just unavailable)', async () => {
    mockRedis.isAvailable.mockReturnValue(true);
    mockRedis.incr.mockResolvedValue(0);
    mockRedis.get.mockResolvedValue(0);

    const limiter = new RateLimiter();
    const result = await limiter.limit('auth.login', '1.2.3.4:user@example.com', {
      max: 5,
      windowSec: 60,
    });

    // Should use memory fallback, not fail-closed
    expect(result.allowed).toBe(true);
    expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
      'rate_limiter_fallback_local_used',
      expect.objectContaining({
        scope: 'auth.login',
        reason: 'redis_error',
        rateLimitMode: 'failopen_memory',
      }),
    );
    expect(mockStructuredLogger.error).not.toHaveBeenCalledWith(
      'rate_limiter_redis_failure_fail_closed',
      expect.anything(),
    );
  });
});
