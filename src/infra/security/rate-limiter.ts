import type { NextResponse } from 'next/server';
import { redisClient } from '../redis.client';
import { sha256Hex } from '../attribution/hash';
import { structuredLogger } from '../log/logger';

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

interface LimitOptions {
  windowSec: number;
  max: number;
  blockSec?: number;
}

interface MemoryBucket {
  count: number;
  expiresAt: number;
}

interface MemoryBlock {
  until: number;
}

const globalForRateLimiter = globalThis as typeof globalThis & {
  __condstoreRateLimiterBuckets?: Map<string, MemoryBucket>;
  __condstoreRateLimiterBlocks?: Map<string, MemoryBlock>;
  __condstoreRateLimiterFallbackMetrics?: { count: number; lastSeenAt: number | null };
};

const memoryBuckets =
  globalForRateLimiter.__condstoreRateLimiterBuckets ??
  (globalForRateLimiter.__condstoreRateLimiterBuckets = new Map<string, MemoryBucket>());

const memoryBlocks =
  globalForRateLimiter.__condstoreRateLimiterBlocks ??
  (globalForRateLimiter.__condstoreRateLimiterBlocks = new Map<string, MemoryBlock>());

const fallbackMetrics =
  globalForRateLimiter.__condstoreRateLimiterFallbackMetrics ??
  (globalForRateLimiter.__condstoreRateLimiterFallbackMetrics = { count: 0, lastSeenAt: null });

export function getRateLimiterFallbackMetrics() {
  return { ...fallbackMetrics };
}

function nowMs(): number {
  return Date.now();
}

function isMemoryFallbackEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function isRateLimitFailClosedOverrideEnabled(): boolean {
  return process.env.RATE_LIMIT_FAIL_CLOSED?.trim().toLowerCase() === 'true';
}

function bucketKey(scope: string, key: string, windowStartSec: number): string {
  return `rl:${scope}:${key}:${windowStartSec}`;
}

function blockKey(scope: string, key: string): string {
  return `rlb:${scope}:${key}`;
}

function computeWindow(now: number, windowSec: number) {
  const nowSec = Math.floor(now / 1000);
  const windowStartSec = Math.floor(nowSec / windowSec) * windowSec;
  const prevWindowStartSec = windowStartSec - windowSec;
  const elapsedSec = nowSec - windowStartSec;
  const prevWeight = Math.max(0, (windowSec - elapsedSec) / windowSec);
  return {
    nowSec,
    windowStartSec,
    prevWindowStartSec,
    elapsedSec,
    prevWeight,
    resetAt: (windowStartSec + windowSec) * 1000,
  };
}

function toRemaining(max: number, effectiveCount: number): number {
  return Math.max(0, Math.floor(max - effectiveCount));
}

function pruneMemory(now: number): void {
  for (const [key, bucket] of memoryBuckets.entries()) {
    if (bucket.expiresAt <= now) {
      memoryBuckets.delete(key);
    }
  }
  for (const [key, block] of memoryBlocks.entries()) {
    if (block.until <= now) {
      memoryBlocks.delete(key);
    }
  }
}

function hashRateLimitKeyInternal(key: string): string {
  return sha256Hex(key)?.slice(0, 16) ?? 'unknown';
}

function failClosedDecision(now: number, options: LimitOptions): RateLimitDecision {
  return {
    allowed: false,
    remaining: 0,
    resetAt: now + options.windowSec * 1000,
    limit: options.max,
  };
}

function failOpenDecision(now: number, options: LimitOptions): RateLimitDecision {
  return {
    allowed: true,
    remaining: options.max,
    resetAt: now + options.windowSec * 1000,
    limit: options.max,
  };
}

async function getRedisNumber(key: string): Promise<number> {
  const value = await redisClient.get<number>(key);
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export class RateLimiter {
  async limit(scope: string, key: string, options: LimitOptions): Promise<RateLimitDecision> {
    const normalizedScope = scope.trim();
    const normalizedKey = key.trim();

    if (!normalizedScope) throw new Error('scope is required');
    if (!normalizedKey) throw new Error('key is required');
    if (!Number.isFinite(options.windowSec) || options.windowSec <= 0) throw new Error('windowSec must be > 0');
    if (!Number.isFinite(options.max) || options.max <= 0) throw new Error('max must be > 0');

    const now = nowMs();

    if (redisClient.isAvailable()) {
      try {
        return await this.limitWithRedis(normalizedScope, normalizedKey, options, now);
      } catch (error) {
        return await this.handleRedisFailure(normalizedScope, normalizedKey, options, now, 'redis_error', error);
      }
    }

    if (isMemoryFallbackEnabled()) {
      return this.limitWithMemory(normalizedScope, normalizedKey, options, now);
    }

    return await this.handleRedisFailure(normalizedScope, normalizedKey, options, now, 'redis_unavailable');
  }

  private async limitWithRedis(scope: string, key: string, options: LimitOptions, now: number): Promise<RateLimitDecision> {
    const window = computeWindow(now, options.windowSec);
    const blockedKey = blockKey(scope, key);

    if (options.blockSec && options.blockSec > 0) {
      const blocked = await redisClient.get<{ until: number }>(blockedKey);
      if (blocked) {
        const ttl = await redisClient.ttl(blockedKey);
        const resetAt = ttl > 0 ? now + ttl * 1000 : (typeof blocked.until === 'number' ? blocked.until : now);
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          limit: options.max,
        };
      }
    }

    const currentKey = bucketKey(scope, key, window.windowStartSec);
    const prevKey = bucketKey(scope, key, window.prevWindowStartSec);

    const [currentCount, prevCount] = await Promise.all([
      redisClient.incr(currentKey),
      getRedisNumber(prevKey),
    ]);

    if (!Number.isFinite(currentCount) || currentCount < 1) {
      throw new Error('rate_limiter_redis_incr_failed');
    }
    if (!Number.isFinite(prevCount) || prevCount < 0) {
      throw new Error('rate_limiter_redis_prev_count_failed');
    }

    if (currentCount === 1) {
      // Keep one extra window so the previous bucket is still available for weighted reads.
      await redisClient.expire(currentKey, options.windowSec * 2);
    }

    const effectiveCount = currentCount + prevCount * window.prevWeight;
    const allowed = effectiveCount <= options.max;
    const remaining = toRemaining(options.max, effectiveCount);

    if (!allowed && options.blockSec && options.blockSec > 0) {
      await redisClient.set(blockedKey, { until: now + options.blockSec * 1000 }, options.blockSec);
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + options.blockSec * 1000,
        limit: options.max,
      };
    }

    return {
      allowed,
      remaining,
      resetAt: window.resetAt,
      limit: options.max,
    };
  }

  private async handleRedisFailure(
    scope: string,
    key: string,
    options: LimitOptions,
    now: number,
    reason: 'redis_unavailable' | 'redis_error',
    error?: unknown,
  ): Promise<RateLimitDecision> {
    const keyHash = hashRateLimitKeyInternal(key);
    const errorName = error instanceof Error ? error.name : undefined;

    if (isMemoryFallbackEnabled()) {
      structuredLogger.warn('rate_limiter_redis_failure_memory_fallback', {
        eventType: 'rate_limiter',
        scope,
        keyHash,
        reason,
        ...(errorName ? { errorName } : {}),
      });
      return this.limitWithMemory(scope, key, options, now);
    }

    if (isRateLimitFailClosedOverrideEnabled()) {
      structuredLogger.error('rate_limiter_redis_failure_fail_closed_override', {
        eventType: 'rate_limiter',
        scope,
        keyHash,
        reason,
        failClosedOverride: true,
        ...(errorName ? { errorName } : {}),
      });
      return failClosedDecision(now, options);
    }

    fallbackMetrics.count += 1;
    fallbackMetrics.lastSeenAt = now;

    structuredLogger.warn('rate_limiter_fallback_active', {
      eventType: 'rate_limiter_fallback_active',
      strategy: 'fail_open',
      env: process.env.NODE_ENV ?? 'development',
      scope,
      keyHash,
      reason,
      failClosedOverride: false,
      ...(errorName ? { errorName } : {}),
    });
    return failOpenDecision(now, options);
  }

  private async limitWithMemory(scope: string, key: string, options: LimitOptions, now: number): Promise<RateLimitDecision> {
    pruneMemory(now);

    const window = computeWindow(now, options.windowSec);
    const blockedKey = blockKey(scope, key);
    const blocked = memoryBlocks.get(blockedKey);
    if (blocked && blocked.until > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: blocked.until,
        limit: options.max,
      };
    }

    const currentKey = bucketKey(scope, key, window.windowStartSec);
    const prevKey = bucketKey(scope, key, window.prevWindowStartSec);

    const currentBucket = memoryBuckets.get(currentKey);
    const prevBucket = memoryBuckets.get(prevKey);

    const currentCount = (currentBucket?.count ?? 0) + 1;
    memoryBuckets.set(currentKey, {
      count: currentCount,
      expiresAt: now + options.windowSec * 2000,
    });

    const prevCount = prevBucket?.count ?? 0;
    const effectiveCount = currentCount + prevCount * window.prevWeight;
    const allowed = effectiveCount <= options.max;
    const remaining = toRemaining(options.max, effectiveCount);

    if (!allowed && options.blockSec && options.blockSec > 0) {
      const until = now + options.blockSec * 1000;
      memoryBlocks.set(blockedKey, { until });
      return {
        allowed: false,
        remaining: 0,
        resetAt: until,
        limit: options.max,
      };
    }

    return {
      allowed,
      remaining,
      resetAt: window.resetAt,
      limit: options.max,
    };
  }
}

export const rateLimiter = new RateLimiter();

export function applyRateLimitHeaders(response: NextResponse, decision: RateLimitDecision): NextResponse {
  response.headers.set('x-ratelimit-limit', String(decision.limit));
  response.headers.set('x-ratelimit-remaining', String(decision.remaining));
  response.headers.set('x-ratelimit-reset', String(decision.resetAt));
  return response;
}

export function hashRateLimitKeyForLog(key: string): string {
  return hashRateLimitKeyInternal(key);
}

