import { NextResponse } from "next/server";
import { redisClient } from "@/infra/redis.client";

export const runtime = "nodejs";

function requiredEnv(name: string) {
  const v = process.env[name];
  return { name, ok: !!v, value: v ? "set" : "missing" };
}

export async function GET() {
  const startedAt = Date.now();

  const hasDb = !!process.env.DATABASE_URL;
  const hasTwilio = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN;

  // Redis: ok / degraded / down / missing
  let redisStatus: "ok" | "degraded" | "down" | "missing" = "degraded";
  let redisError: string | null = null;

  try {
    const redis = redisClient;
    if (!redis.isAvailable()) {
      redisStatus = process.env.NODE_ENV === 'production' ? "missing" : "degraded";
    } else {
      const pong = await redis.ping();
      redisStatus = pong ? "ok" : "down";
      if (redisStatus === "down") redisError = `ping failed`;
    }
  } catch (err: any) {
    redisStatus = "down";
    redisError = err?.message ?? String(err);
  }

  const ok = hasDb && hasTwilio && redisStatus !== "down";

  return NextResponse.json(
    {
      ok,
      service: "projeto-condstore",
      ts: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      checks: {
        db: hasDb ? "ok" : "missing",
        redis: redisStatus,
        twilio: hasTwilio,
      },
    },
    { status: ok ? 200 : 503 }
  );
}
