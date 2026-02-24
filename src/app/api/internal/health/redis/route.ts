/**
 * GET /api/internal/health/redis
 *
 * Verifica disponibilidade do Redis.
 *
 * Sem REDIS_URL:
 *   200 { ok: true, configured: false, note: "in-memory fallback ativo" }
 *
 * Com REDIS_URL + ping OK:
 *   200 { ok: true, configured: true, latencyMs }
 *
 * Com REDIS_URL + ping falha:
 *   503 { ok: false, configured: true, error }
 */
export const runtime = "nodejs";

import { NextResponse, NextRequest } from "next/server";
import { redisClient } from "@/infra/redis.client";
import { withRequestTrace } from "@/infra/http/request-trace";

async function handler(request: NextRequest): Promise<NextResponse> {
  const timestamp = new Date().toISOString();

  // Redis não configurado — fallback em memória, comportamento esperado em dev
  if (!process.env.REDIS_URL) {
    return NextResponse.json({
      ok: true,
      configured: false,
      note: "REDIS_URL não definida — usando fallback in-memory (rate-limit e idempotência não distribuídos)",
      timestamp,
    });
  }

  // Redis configurado: testar ping
  const start = Date.now();
  try {
    const alive = await redisClient.ping();
    const latencyMs = Date.now() - start;

    if (!alive) {
      return NextResponse.json(
        { ok: false, configured: true, error: "Ping retornou false", latencyMs, timestamp },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      latencyMs,
      timestamp,
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      { ok: false, configured: true, error: message, latencyMs, timestamp },
      { status: 503 }
    );
  }
}

export const GET = withRequestTrace(handler);
