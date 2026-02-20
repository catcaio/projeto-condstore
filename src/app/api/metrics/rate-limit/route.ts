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

  const indexKey = `rl:metrics:index:${tenantId}`;
  const buckets = await redis.smembers(indexKey);

  const data: Record<string, number> = {};

  for (const bucket of buckets) {
    const value = await redis.get(`rl:metrics:${tenantId}:${bucket}`);
    data[bucket] = Number(value ?? 0);
  }

  return NextResponse.json({
    tenantId,
    buckets: data
  });
}
