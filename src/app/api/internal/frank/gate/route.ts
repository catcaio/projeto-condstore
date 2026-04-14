export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { logger } from '@/infra/logger';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { withRequestTrace, getTracedRequestId } from '@/infra/http/request-trace';
import { gateEvaluate, type GateThresholds, type ModelMetrics } from '@/infra/frank/frank-gate';
import { applyFrankInternalRateLimit } from '@/infra/security/frank-rate-limit';

interface GateDecision {
  ok: true;
  decision: 'PASS' | 'FAIL' | 'INSUFFICIENT_DATA';
  reasons: string[];
  thresholds: GateThresholds;
  metrics: {
    baseline: ModelMetrics | null;
    candidate: ModelMetrics | null;
  };
  timestamp: string;
}

interface GateErrorResponse {
  ok: false;
  error: string;
  timestamp: string;
}

async function handler(request: NextRequest): Promise<NextResponse> {
  const authResult = requireInternalToken(request, { purpose: ['export', 'diag'] });
  if (!authResult.ok) return authResult.response;

  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim();
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: 'tenantId is required', timestamp: new Date().toISOString() },
      { status: 400 },
    );
  }

  const requestId = getTracedRequestId(request) ?? '';
  const rl = await applyFrankInternalRateLimit({ tenantId, requestId, route: '/api/internal/frank/gate' });
  if (rl.blocked) return rl.response;

  const baseline = request.nextUrl.searchParams.get('baseline')?.trim();
  if (!baseline) {
    return NextResponse.json(
      { ok: false, error: 'baseline model version is required', timestamp: new Date().toISOString() },
      { status: 400 },
    );
  }

  const candidate = request.nextUrl.searchParams.get('candidate')?.trim();
  if (!candidate) {
    return NextResponse.json(
      { ok: false, error: 'candidate model version is required', timestamp: new Date().toISOString() },
      { status: 400 },
    );
  }

  const sinceHours = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('sinceHours') || '24', 10));

  try {
    const db = await getDb();
    const result = await gateEvaluate(db, { tenantId, baseline, candidate, sinceHours });

    const response: GateDecision = {
      ok: true,
      decision: result.decision,
      reasons: result.reasons,
      thresholds: result.thresholds,
      metrics: result.metrics,
      timestamp: result.timestamp,
    };

    logger.info('frank_gate_evaluated', {
      tenantId,
      baseline,
      candidate,
      sinceHours,
      decision: result.decision,
      reasonCount: result.reasons.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('frank_gate_failed', error instanceof Error ? error : new Error(String(error)), {
      tenantId,
      baseline,
      candidate,
      sinceHours,
    });

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to evaluate gate',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export const GET = withRequestTrace(handler);
