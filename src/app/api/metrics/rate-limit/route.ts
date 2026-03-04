import { NextResponse, NextRequest } from "next/server";
import { redisClient } from "@/infra/redis.client";
import { requireAdminSession } from "@/infra/auth/tenant-route-guard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authResult = await requireAdminSession(req);
  if (!authResult.ok) return authResult.response;

  const { tenantId } = authResult;

  const redis = redisClient;
  if (!redis) {
    return NextResponse.json({ error: "redis unavailable" }, { status: 503 });
  }

  const keys = await redis.keys(`rl:metrics:${tenantId}:*`);

  const data: Record<string, number> = {};

  for (const key of keys) {
    const bucket = key.split(":")[3];
    const value = await redis.get(key);
    data[bucket] = Number(value ?? 0);
  }

  return NextResponse.json({
    tenantId,
    buckets: data
  });
}
