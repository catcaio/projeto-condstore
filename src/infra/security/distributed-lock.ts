import { randomUUID } from 'crypto';
import { redisClient } from '../redis.client';

interface MemoryLockEntry {
  token: string;
  expiresAt: number;
}

const memoryLocks = new Map<string, MemoryLockEntry>();

const RELEASE_IF_MATCH_LUA = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
`.trim();

function nowMs(): number {
  return Date.now();
}

function cleanupExpiredMemoryLocks(): void {
  const now = nowMs();
  for (const [key, value] of memoryLocks.entries()) {
    if (value.expiresAt <= now) {
      memoryLocks.delete(key);
    }
  }
}

function canUseMemoryFallback(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export async function acquireLock(key: string, ttlSec: number): Promise<{ acquired: boolean; token: string }> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error('lock key is required');
  }
  if (!Number.isInteger(ttlSec) || ttlSec <= 0) {
    throw new Error('ttlSec must be a positive integer');
  }

  const token = randomUUID();

  if (redisClient.isAvailable()) {
    const acquired = await redisClient.setNx(normalizedKey, token, ttlSec);
    return { acquired, token };
  }

  if (!canUseMemoryFallback()) {
    return { acquired: false, token };
  }

  cleanupExpiredMemoryLocks();
  if (memoryLocks.has(normalizedKey)) {
    return { acquired: false, token };
  }

  memoryLocks.set(normalizedKey, {
    token,
    expiresAt: nowMs() + (ttlSec * 1000),
  });
  return { acquired: true, token };
}

export async function releaseLock(key: string, token: string): Promise<void> {
  const normalizedKey = key.trim();
  const normalizedToken = token.trim();
  if (!normalizedKey || !normalizedToken) {
    return;
  }

  if (redisClient.isAvailable()) {
    await redisClient.eval(RELEASE_IF_MATCH_LUA, 1, normalizedKey, normalizedToken);
    return;
  }

  if (!canUseMemoryFallback()) {
    return;
  }

  cleanupExpiredMemoryLocks();
  const current = memoryLocks.get(normalizedKey);
  if (!current) return;
  if (current.token !== normalizedToken) return;
  memoryLocks.delete(normalizedKey);
}

