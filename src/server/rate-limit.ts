import { getRedis } from "@/infra/redis.client";
import { NextResponse } from "next/server";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 60;

export async function rateLimitTenant(tenantId: string) {
  const redis = getRedis();

  // Preview/local sem REDIS_URL -> não bloquear
  if (!redis) return null;

  const key = `rl:${tenantId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  if (current > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Rate limit exceeded", code: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(WINDOW_SECONDS) } }
    );
  }

  return null;
}
