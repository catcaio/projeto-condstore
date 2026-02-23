import { describe, it, expect, vi, beforeEach } from 'vitest';
import { acquireIdempotency, markIdempotencyDone, getIdempotency } from '../redis-idempotency';

const mockRedis = vi.hoisted(() => ({
  isAvailable: vi.fn(),
  setNx: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
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

describe('redis-idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.isAvailable.mockReturnValue(true);
  });

  it('acquires on first attempt and blocks on second', async () => {
    mockRedis.setNx.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const first = await acquireIdempotency('idem:t1:route:key');
    const second = await acquireIdempotency('idem:t1:route:key');
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('marks done and retrieves payload', async () => {
    mockRedis.get.mockResolvedValueOnce({ status: 'done', payload: { ok: true } });
    await markIdempotencyDone('idem:t1:route:key', { ok: true });
    const result = await getIdempotency<{ status: string; payload: { ok: boolean } }>('idem:t1:route:key');
    expect(result?.payload.ok).toBe(true);
  });

  it('fails open when redis unavailable', async () => {
    mockRedis.isAvailable.mockReturnValue(false);
    const acquired = await acquireIdempotency('idem:t1:route:key');
    expect(acquired).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});
