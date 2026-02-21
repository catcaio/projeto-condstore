import { redisClient } from "@/infra/redis.client";

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
  const redis = redisClient;

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

const RL_ALERT_THRESHOLD = Number(process.env.RATE_LIMIT_ALERT_THRESHOLD ?? "0.9");

async function rlAlertDedupe(key: string, seconds: number): Promise<boolean> {
  // fallback: se redis indisponível, não alerta
  try {
    const redis = redisClient;
    if (!redis.isAvailable()) return false;
    // Simulate NX behavior (good enough for alerts)
    const existing = await redis.get(key);
    if (existing) return false;
    await redis.set(key, "1", seconds);
    return true;
  } catch {
    return false;
  }
}
