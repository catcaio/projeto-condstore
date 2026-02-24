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
import { makeRequestId, respondInfraError } from "@/infra/http/infra-error";

export async function GET(request: NextRequest) {
  const requestId = makeRequestId();
  const start = Date.now();
  try {
    const db = await getDb();
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - start;

    return NextResponse.json(
      {
        ok: true,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (err) {
    return respondInfraError(err, requestId);
  }
}
