import { getRedis } from "@/infra/redis.client";

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  remaining: number;
  resetAt: number;
}

export async function rateLimitCheck(params: {
  tenantId: string;
  bucket: string;
  maxRequests: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {

  const { tenantId, bucket, maxRequests, windowSeconds } = params;
  const redis = getRedis();

  if (!redis) {
    return {
      allowed: true,
      current: 0,
      remaining: maxRequests,
      resetAt: Date.now() + windowSeconds * 1000
    };
  }

  const key = `rl:${tenantId}:${bucket}`;
  const metricsKey = `rl:metrics:${tenantId}:${bucket}`;

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  // 🔥 métrica acumulada diária
  await redis.incr(metricsKey);
  await redis.expire(metricsKey, 86400);

  const ttl = await redis.ttl(key);
  const resetAt = Date.now() + (ttl ?? windowSeconds) * 1000;

  return {
    allowed: current <= maxRequests,
    current,
    remaining: Math.max(0, maxRequests - current),
    resetAt
  };
}
