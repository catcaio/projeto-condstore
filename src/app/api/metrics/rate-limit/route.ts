import { NextResponse } from "next/server";
import { getRedis } from "@/infra/redis.client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenant");

  if (!tenantId) {
    return NextResponse.json({ error: "tenant required" }, { status: 400 });
  }

  const redis = getRedis();
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
