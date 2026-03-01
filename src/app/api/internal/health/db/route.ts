/**
 * GET /api/internal/health/db
 *
 * Verifica conectividade com o banco de dados (TiDB/MySQL).
 * Executa SELECT 1 e mede latência.
 *
 * Resposta 200: { ok: true, latencyMs, timestamp }
 * Resposta 503: { ok: false, error, code, retryable, requestId }
 */
export const runtime = "nodejs";

import { NextResponse, NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/infra/db";
import { respondInfraError } from "@/infra/http/infra-error";
import { withRequestTrace } from "@/infra/http/request-trace";
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';

async function handler(request: NextRequest): Promise<NextResponse> {
  const internalGuard = requireInternalToken(request);
  if (!internalGuard.ok) return internalGuard.response;
  const start = Date.now();
  try {
    const db = await getDb();
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      ok: true,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // requestId will be added by withRequestTrace wrapper
    return respondInfraError(err, "");
  }
}

export const GET = withRequestTrace(handler);
