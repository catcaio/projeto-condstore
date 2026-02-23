import { createHash } from 'crypto';
import { redisClient } from '../redis.client';
import { logger } from '../logger';

export interface RedisRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimitInput {
  tenantId: string;
  scope: string;
  limit?: number;
  windowSeconds?: number;
  requestId?: string;
}

const DEFAULT_WINDOW_SECONDS = Number.parseInt(process.env.RATE_LIMIT_DEFAULT_WINDOW_SECONDS || '60', 10);
const DEFAULT_MAX = Number.parseInt(process.env.RATE_LIMIT_DEFAULT_MAX || '60', 10);

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

export async function checkRedisRateLimit(input: RateLimitInput): Promise<RedisRateLimitResult> {
  if (!input.tenantId) {
    throw new Error('tenantId is required');
  }
  if (!input.scope) {
    throw new Error('scope is required');
  }

  const limit = input.limit ?? DEFAULT_MAX;
  const windowSeconds = input.windowSeconds ?? DEFAULT_WINDOW_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const resetAt = (windowStart + windowSeconds) * 1000;
  const key = `rl:${input.tenantId}:${input.scope}:${windowStart}`;
  const keyHash = hashKey(key);

  if (!redisClient.isAvailable()) {
    logger.warn('rate_limit.redis_unavailable', {
      tenantId: input.tenantId,
      scope: input.scope,
      key_hash: keyHash,
      requestId: input.requestId,
    });
    return { allowed: true, remaining: limit, resetAt };
  }

  try {
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    logger.info(allowed ? 'rate_limit.allowed' : 'rate_limit.blocked', {
      tenantId: input.tenantId,
      scope: input.scope,
      key_hash: keyHash,
      remaining,
      limit,
      resetAt,
      requestId: input.requestId,
    });

    return { allowed, remaining, resetAt };
  } catch (error) {
    logger.error('rate_limit.redis_error', error as Error, {
      tenantId: input.tenantId,
      scope: input.scope,
      key_hash: keyHash,
      requestId: input.requestId,
    });
    return { allowed: true, remaining: limit, resetAt };
  }
}
