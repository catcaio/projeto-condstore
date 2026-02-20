import { NextResponse } from "next/server";
import { getRedis } from "@/infra/redis.client";

export const runtime = "nodejs";

function requiredEnv(name: string) {
  const v = process.env[name];
  return { name, ok: !!v, value: v ? "set" : "missing" };
}

export async function GET() {
  const startedAt = Date.now();

  // 🔥 Ajusta aqui se quiser exigir mais variáveis
  const env = [
    requiredEnv("TIDB_HOST"),
    requiredEnv("TIDB_USER"),
    requiredEnv("TIDB_PASSWORD"),
    requiredEnv("TIDB_DATABASE"),
    requiredEnv("REDIS_URL"), // pode ser opcional em preview
    requiredEnv("TWILIO_ACCOUNT_SID"),
    requiredEnv("TWILIO_AUTH_TOKEN"),
  ];

  const envOk = env.filter(e => e.name !== "REDIS_URL").every(e => e.ok);

  // Redis: ok / degraded / down
  let redisStatus: "ok" | "degraded" | "down" = "degraded";
  let redisError: string | null = null;

  try {
    const redis = getRedis();
    if (!redis) {
      redisStatus = "degraded"; // preview/local sem REDIS_URL
    } else {
      const pong = await redis.ping();
      redisStatus = pong === "PONG" ? "ok" : "down";
      if (redisStatus === "down") redisError = `ping=${pong}`;
    }
  } catch (err: any) {
    redisStatus = "down";
    redisError = err?.message ?? String(err);
  }

  const ok = envOk && redisStatus !== "down";

  return NextResponse.json(
    {
      ok,
      service: "projeto-condstore",
      ts: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      checks: {
        env: { ok: envOk, items: env },
        redis: { status: redisStatus, error: redisError },
      },
    },
    { status: ok ? 200 : 503 }
  );
}
