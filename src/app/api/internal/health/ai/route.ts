/**
 * GET /api/internal/health/ai
 *
 * Verifica se o provider de IA (LM Studio local ou cloud) está acessível.
 * Tenta GET {baseUrl}/models com timeout de 5s.
 *
 * Resposta 200: { ok: true, url, models[] }
 * Resposta 503: { ok: false, error, url }
 */
export const runtime = "nodejs";

import { NextResponse, NextRequest } from "next/server";
import { withRequestTrace } from "@/infra/http/request-trace";

async function handler(request: NextRequest): Promise<NextResponse> {
  const baseUrl =
    process.env.DEFAULT_LMSTUDIO_BASE_URL ??
    process.env.DEFAULT_CLOUD_BASE_URL;

  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "No AI base URL configured (DEFAULT_LMSTUDIO_BASE_URL or DEFAULT_CLOUD_BASE_URL)" },
      { status: 503 }
    );
  }

  const modelsUrl = `${baseUrl.replace(/\/$/, "")}/models`;

  try {
    const res = await fetch(modelsUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, status: res.status, url: modelsUrl },
        { status: 503 }
      );
    }

    const body = await res.json();
    const models: string[] = (body?.data ?? []).map(
      (m: { id: string }) => m.id
    );

    return NextResponse.json({
      ok: true,
      url: modelsUrl,
      models,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, url: modelsUrl, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}

export const GET = withRequestTrace(handler);
