import { describe, expect, it, vi } from 'vitest';

vi.mock('../../redis.client', () => ({
  redisClient: {
    isAvailable: vi.fn().mockReturnValue(false),
    setNx: vi.fn(),
    eval: vi.fn(),
  },
}));

import { acquireLock, releaseLock } from '../distributed-lock';

function uniqueKey(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

describe('distributed-lock (memory fallback)', () => {
  it('acquires lock, rejects second acquire, and release frees it', async () => {
    const key = uniqueKey('lock');

    const first = await acquireLock(key, 30);
    expect(first.acquired).toBe(true);
    expect(first.token).toBeTruthy();

    const second = await acquireLock(key, 30);
    expect(second.acquired).toBe(false);

    await releaseLock(key, first.token);

    const third = await acquireLock(key, 30);
    expect(third.acquired).toBe(true);
    await releaseLock(key, third.token);
  });

  it('does not release lock when token is wrong', async () => {
    const key = uniqueKey('lock-wrong-token');

    const first = await acquireLock(key, 30);
    expect(first.acquired).toBe(true);

    await releaseLock(key, 'wrong-token');

    const second = await acquireLock(key, 30);
    expect(second.acquired).toBe(false);

    await releaseLock(key, first.token);
  });
});

