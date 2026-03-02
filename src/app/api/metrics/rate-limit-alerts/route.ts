import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from "next/server";
import { redisClient } from "@/infra/redis.client";

async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  const bucketsKey = `rl:alerts:buckets:${tenantId}`;
  const buckets = (await redisClient.get<string[]>(bucketsKey)) ?? [];

  const near: Record<string, { count: number; last: number | null }> = {};
  const blocked: Record<string, { count: number; last: number | null }> = {};

  for (const bucket of buckets) {
    const nearCountKey = `rl:alerts:count:near:${tenantId}:${bucket}`;
    const nearLastKey  = `rl:alerts:last:near:${tenantId}:${bucket}`;
    const blkCountKey  = `rl:alerts:count:blocked:${tenantId}:${bucket}`;
    const blkLastKey   = `rl:alerts:last:blocked:${tenantId}:${bucket}`;

    const [nc, nl, bc, bl] = await Promise.all([
      redisClient.get<number>(nearCountKey),
      redisClient.get<number>(nearLastKey),
      redisClient.get<number>(blkCountKey),
      redisClient.get<number>(blkLastKey),
    ]);

    near[bucket] = { count: nc ?? 0, last: nl ?? null };
    blocked[bucket] = { count: bc ?? 0, last: bl ?? null };
  }

  return NextResponse.json({ tenantId, buckets, near, blocked });
}

export const GET = withGlobalErrorInterceptor(_GET);
