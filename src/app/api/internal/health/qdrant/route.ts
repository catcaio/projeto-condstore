export const runtime = "nodejs";

import { NextResponse, NextRequest } from "next/server";
import { getQdrantConfig, qdrantHealth } from "@/infra/vector/qdrant.client";
import { withRequestTrace } from "@/infra/http/request-trace";
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';

async function handler(request: NextRequest): Promise<NextResponse> {
  const internalGuard = requireInternalToken(request);
  if (!internalGuard.ok) return internalGuard.response;
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

    return NextResponse.json({
      ok: true,
      url: cfg.url,
      collection: cfg.collection,
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

export const GET = withRequestTrace(handler);

