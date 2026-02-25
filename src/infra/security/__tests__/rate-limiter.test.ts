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

import { RateLimiter } from '../rate-limiter';

describe('security rate-limiter redis failure hardening', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFailOpen = process.env.RATE_LIMIT_FAIL_OPEN;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-25T12:00:00.000Z'));

    process.env.NODE_ENV = 'production';
    delete process.env.RATE_LIMIT_FAIL_OPEN;

    mockRedis.isAvailable.mockReturnValue(false);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.ttl.mockResolvedValue(-2);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(undefined);
    mockRedis.set.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalFailOpen === undefined) {
      delete process.env.RATE_LIMIT_FAIL_OPEN;
    } else {
      process.env.RATE_LIMIT_FAIL_OPEN = originalFailOpen;
    }
  });

  it('fails closed in production when redis is unavailable', async () => {
    const limiter = new RateLimiter();
    const now = Date.now();

    const result = await limiter.limit('auth.login', '1.2.3.4:user@example.com', {
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
        scope: 'auth.login',
        keyHash: '0123456789abcdef',
        reason: 'redis_unavailable',
        failOpenOverride: false,
      }),
    );

    const logContext = mockStructuredLogger.error.mock.calls[0]?.[1];
    expect(logContext).not.toHaveProperty('key');
    expect(JSON.stringify(logContext)).not.toContain('user@example.com');
  });

  it('allows only when RATE_LIMIT_FAIL_OPEN=true is explicitly set', async () => {
    process.env.RATE_LIMIT_FAIL_OPEN = 'true';
    const limiter = new RateLimiter();
    const now = Date.now();

    const result = await limiter.limit('auth.login', '1.2.3.4:user@example.com', {
      max: 5,
      windowSec: 60,
    });

    expect(result).toEqual({
      allowed: true,
      remaining: 5,
      resetAt: now + 60_000,
      limit: 5,
    });
    expect(mockStructuredLogger.warn).toHaveBeenCalledWith(
      'rate_limiter_redis_failure_fail_open_override',
      expect.objectContaining({
        eventType: 'rate_limiter',
        scope: 'auth.login',
        keyHash: '0123456789abcdef',
        reason: 'redis_unavailable',
        failOpenOverride: true,
      }),
    );
  });

  it('fails closed in production when redis operation fails while available', async () => {
    mockRedis.isAvailable.mockReturnValue(true);
    mockRedis.incr.mockResolvedValue(0);
    mockRedis.get.mockResolvedValue(0);

    const limiter = new RateLimiter();
    const result = await limiter.limit('auth.login', '1.2.3.4:user@example.com', {
      max: 5,
      windowSec: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(mockStructuredLogger.error).toHaveBeenCalledWith(
      'rate_limiter_redis_failure_fail_closed',
      expect.objectContaining({
        scope: 'auth.login',
        keyHash: '0123456789abcdef',
        reason: 'redis_error',
        failOpenOverride: false,
        errorName: 'Error',
      }),
    );
  });
});
