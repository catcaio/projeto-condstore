import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRedisRateLimit } from '../redis-rate-limiter';

const mockRedis = vi.hoisted(() => ({
  isAvailable: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
}));

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../redis.client', () => ({
  redisClient: mockRedis,
}));

vi.mock('../../logger', () => ({
  logger: mockLogger,
}));

describe('redis-rate-limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-23T00:00:00Z'));
    mockRedis.isAvailable.mockReturnValue(true);
  });

  it('allows when redis is unavailable (fail-open)', async () => {
    mockRedis.isAvailable.mockReturnValue(false);
    const result = await checkRedisRateLimit({ tenantId: 't1', scope: 'ai.chat' });
    expect(result.allowed).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('increments and allows within limit', async () => {
    mockRedis.incr.mockResolvedValueOnce(1);
    const result = await checkRedisRateLimit({ tenantId: 't1', scope: 'ai.chat', limit: 2, windowSeconds: 60 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
    expect(mockRedis.expire).toHaveBeenCalled();
  });

  it('blocks when limit exceeded', async () => {
    mockRedis.incr.mockResolvedValueOnce(3);
    const result = await checkRedisRateLimit({ tenantId: 't1', scope: 'ai.chat', limit: 2, windowSeconds: 60 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(mockLogger.info).toHaveBeenCalled();
  });
});
