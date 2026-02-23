import { createHash } from 'crypto';
import { redisClient } from '../redis.client';
import { logger } from '../logger';

const DEFAULT_TTL_SECONDS = Number.parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '86400', 10);

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

export async function acquireIdempotency(key: string, ttlSeconds: number = DEFAULT_TTL_SECONDS, requestId?: string): Promise<boolean> {
  const keyHash = hashKey(key);

  if (!redisClient.isAvailable()) {
    logger.warn('idempotency.redis_unavailable', { key_hash: keyHash, requestId });
    return true;
  }

  try {
    const acquired = await redisClient.setNx(key, { status: 'processing', at: Date.now() }, ttlSeconds);
    logger.info(acquired ? 'idem.miss' : 'idem.hit', { key_hash: keyHash, requestId });
    return acquired;
  } catch (error) {
    logger.error('idempotency.redis_error', error as Error, { key_hash: keyHash, requestId });
    return true;
  }
}

export async function markIdempotencyDone(
  key: string,
  payload?: unknown,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  requestId?: string
): Promise<void> {
  const keyHash = hashKey(key);

  if (!redisClient.isAvailable()) {
    logger.warn('idempotency.redis_unavailable', { key_hash: keyHash, requestId });
    return;
  }

  try {
    await redisClient.set(key, { status: 'done', payload, at: Date.now() }, ttlSeconds);
  } catch (error) {
    logger.error('idempotency.redis_error', error as Error, { key_hash: keyHash, requestId });
  }
}

export async function getIdempotency<T = unknown>(key: string, requestId?: string): Promise<T | null> {
  const keyHash = hashKey(key);

  if (!redisClient.isAvailable()) {
    logger.warn('idempotency.redis_unavailable', { key_hash: keyHash, requestId });
    return null;
  }

  try {
    return await redisClient.get<T>(key);
  } catch (error) {
    logger.error('idempotency.redis_error', error as Error, { key_hash: keyHash, requestId });
    return null;
  }
}
