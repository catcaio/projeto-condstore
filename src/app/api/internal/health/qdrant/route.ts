export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ensureCollection, getQdrantConfig, qdrantHealth } from "@/infra/vector/qdrant.client";

export async function GET() {
  const cfg = getQdrantConfig();

  try {
    const health = await qdrantHealth();
    if (!health.ok) {
      return NextResponse.json(
        {
          ok: false,
          url: cfg.url,
          collection: cfg.collection,
          ensured: false,
          status: health.status,
          error: typeof health.body === "string" ? health.body : "Qdrant health check failed",
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    const ensuredResult = await ensureCollection();

    return NextResponse.json({
      ok: true,
      url: cfg.url,
      collection: cfg.collection,
      ensured: ensuredResult.ensured,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        url: cfg.url,
        collection: cfg.collection,
        ensured: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

