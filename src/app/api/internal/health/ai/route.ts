/**
 * GET /api/internal/health/ai
 *
 * Verifica se o provider de IA (LM Studio local ou cloud) está acessível.
 *
 * Comportamento:
 * - Sem env configurada → 200 { ok: false, skipped: true, reason: '...' }
 * - Provider inacessível → 503 { ok: false, error: '...' }
 * - Provider saudável → 200 { ok: true, url, baseUrl, model, embedModel }
 */
import { NextRequest, NextResponse } from "next/server";
import { withRequestTrace } from "@/infra/http/request-trace";
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { checkAIHealth } from '@/core/ai/health-check';

export const runtime = "nodejs";

async function handler(request: NextRequest): Promise<NextResponse> {
  const internalGuard = requireInternalToken(request);
  if (!internalGuard.ok) return internalGuard.response;

  const result = await checkAIHealth();

  if (result.skipped) {
    // No AI provider configured — this is expected in local/dev environments
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: result.reason,
      timestamp: new Date().toISOString(),
    });
  }

  if (!result.ok) {
    // AI provider is configured but unreachable — genuine failure
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        url: result.baseUrl,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    url: result.baseUrl,
    model: result.model,
    embedModel: result.embedModel,
    timestamp: new Date().toISOString(),
  });
}

export const GET = withRequestTrace(handler);
