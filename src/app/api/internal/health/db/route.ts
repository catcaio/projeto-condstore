/**
 * GET /api/internal/health/db
 *
 * Verifica conectividade com o banco de dados (TiDB/MySQL).
 * Executa SELECT 1 e mede latência.
 *
 * Resposta 200: { ok: true, latencyMs, timestamp }
 * Resposta 503: { ok: false, error, timestamp }
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/infra/db";

export async function GET() {
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
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      {
        ok: false,
        error: message,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
