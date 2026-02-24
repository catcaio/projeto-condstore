export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, sql } from 'drizzle-orm';
import { frankEvents } from '@/drizzle/schema';
import { getDb } from '@/infra/db';
import { logger } from '@/infra/logger';
import { getInternalExportTokenOrThrow, isInternalTokenAuthorized } from '@/infra/config/internal-token';
import { withRequestTrace } from '@/infra/http/request-trace';
import { getTenantOverride, setTenantOverride, clearTenantOverride } from '@/infra/frank/frank-override-store';

interface RollbackBody {
  tenantId?: string;
  baseline?: string;
  candidate?: string;
  sinceHours?: number;
  dryRun?: boolean;
}

interface ModelMetrics {
  count: number;
  avgLatencyMs: number | null;
  avgTokensPrompt: number | null;
  avgTokensCompletion: number | null;
  errorRate: number;
}

interface RollbackResponse {
  ok: true;
  applied: boolean;
  previousOverride: string | null;
  newOverride: string | null;
  decision: string;
  reasons: string[];
  dryRun: boolean;
  timestamp: string;
}

interface RollbackErrorResponse {
  ok: false;
  error: string;
  timestamp: string;
}

async function getModelMetrics(
  db: Awaited<ReturnType<typeof getDb>>,
  tenantId: string,
  modelVersionId: string,
  since: Date,
): Promise<ModelMetrics | null> {
  const metricsRows = await db
    .select({
      count: sql<number>`COUNT(*)`,
      avg_latency_ms: sql<number>`AVG(${frankEvents.latencyMs})`,
      error_count: sql<number>`SUM(CASE WHEN ${frankEvents.latencyMs} IS NULL THEN 1 ELSE 0 END)`,
      avg_tokens_prompt: sql<number>`AVG(${frankEvents.tokensPrompt})`,
      avg_tokens_completion: sql<number>`AVG(${frankEvents.tokensCompletion})`,
    })
    .from(frankEvents)
    .where(
      and(
        eq(frankEvents.tenantId, tenantId),
        gte(frankEvents.createdAt, since),
        sql`JSON_EXTRACT(${frankEvents.payloadJson}, '$.modelVersionId') = ${modelVersionId}`,
      ),
    );

  const row = metricsRows[0];
  if (!row || row.count === 0) {
    return null;
  }

  const errorRate = row.count > 0 ? Math.round((row.error_count / row.count) * 10000) / 100 : 0;

  return {
    count: row.count,
    avgLatencyMs: row.avg_latency_ms ? Math.round(row.avg_latency_ms * 100) / 100 : null,
    avgTokensPrompt: row.avg_tokens_prompt ? Math.round(row.avg_tokens_prompt * 100) / 100 : null,
    avgTokensCompletion: row.avg_tokens_completion ? Math.round(row.avg_tokens_completion * 100) / 100 : null,
    errorRate,
  };
}

function evaluateGate(
  baseline: ModelMetrics | null,
  candidate: ModelMetrics | null,
  minEvents: number,
  maxErrorRateDelta: number,
  maxP95LatencyDeltaPct: number,
  maxAvgTokensDeltaPct: number,
): { decision: 'PASS' | 'FAIL' | 'INSUFFICIENT_DATA'; reasons: string[] } {
  const reasons: string[] = [];

  // Check data sufficiency
  if (!baseline || !candidate) {
    reasons.push('Insufficient data for both baseline and candidate');
    return { decision: 'INSUFFICIENT_DATA', reasons };
  }

  if (baseline.count < minEvents || candidate.count < minEvents) {
    reasons.push(`Event count below minimum (baseline: ${baseline.count}, candidate: ${candidate.count}, min: ${minEvents})`);
    return { decision: 'INSUFFICIENT_DATA', reasons };
  }

  // Compare error rates
  const errorRateDelta = Math.abs(candidate.errorRate - baseline.errorRate);
  if (errorRateDelta > maxErrorRateDelta) {
    reasons.push(
      `Error rate delta ${(errorRateDelta * 100).toFixed(2)}pp exceeds threshold ${(maxErrorRateDelta * 100).toFixed(2)}pp`,
    );
  }

  // Compare latency
  if (baseline.avgLatencyMs !== null && candidate.avgLatencyMs !== null) {
    const latencyDeltaPct = ((candidate.avgLatencyMs - baseline.avgLatencyMs) / baseline.avgLatencyMs) * 100;
    if (latencyDeltaPct > maxP95LatencyDeltaPct * 100) {
      reasons.push(`Avg latency increase ${latencyDeltaPct.toFixed(2)}% exceeds threshold ${(maxP95LatencyDeltaPct * 100).toFixed(2)}%`);
    }
  }

  // Compare tokens
  if (baseline.avgTokensPrompt !== null && candidate.avgTokensPrompt !== null) {
    const tokensDeltaPct = ((candidate.avgTokensPrompt - baseline.avgTokensPrompt) / baseline.avgTokensPrompt) * 100;
    if (tokensDeltaPct > maxAvgTokensDeltaPct * 100) {
      reasons.push(`Avg tokens increase ${tokensDeltaPct.toFixed(2)}% exceeds threshold ${(maxAvgTokensDeltaPct * 100).toFixed(2)}%`);
    }
  }

  const decision = reasons.length === 0 ? 'PASS' : 'FAIL';
  return { decision, reasons };
}

async function handler(request: NextRequest): Promise<NextResponse> {
  try {
    getInternalExportTokenOrThrow();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'INTERNAL_EXPORT_TOKEN not configured',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }

  const token = request.headers.get('x-internal-token');
  if (!isInternalTokenAuthorized(token)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized', timestamp: new Date().toISOString() },
      { status: 401 },
    );
  }

  let body: RollbackBody;
  try {
    body = (await request.json()) as RollbackBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body', timestamp: new Date().toISOString() },
      { status: 400 },
    );
  }

  const tenantId = body.tenantId?.trim();
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: 'tenantId is required', timestamp: new Date().toISOString() },
      { status: 400 },
    );
  }

  const baseline = body.baseline?.trim();
  if (!baseline) {
    return NextResponse.json(
      { ok: false, error: 'baseline model version is required', timestamp: new Date().toISOString() },
      { status: 400 },
    );
  }

  const candidate = body.candidate?.trim();
  if (!candidate) {
    return NextResponse.json(
      { ok: false, error: 'candidate model version is required', timestamp: new Date().toISOString() },
      { status: 400 },
    );
  }

  const sinceHours = Math.max(1, Number.parseInt(String(body.sinceHours || '24'), 10));
  const dryRun = body.dryRun === true;

  try {
    const db = await getDb();
    const since = new Date(Date.now() - sinceHours * 3600 * 1000);

    // Gate thresholds
    const minEvents = Number.parseInt(process.env.FRANK_GATE_MIN_EVENTS || '50', 10);
    const maxErrorRateDelta = Number.parseFloat(process.env.FRANK_GATE_MAX_ERROR_RATE_DELTA || '0.01');
    const maxP95LatencyDeltaPct = Number.parseFloat(process.env.FRANK_GATE_MAX_P95_LATENCY_DELTA_PCT || '0.20');
    const maxAvgTokensDeltaPct = Number.parseFloat(process.env.FRANK_GATE_MAX_AVG_TOKENS_DELTA_PCT || '0.15');

    // Evaluate gate
    const [baselineMetrics, candidateMetrics] = await Promise.all([
      getModelMetrics(db, tenantId, baseline, since),
      getModelMetrics(db, tenantId, candidate, since),
    ]);

    const { decision, reasons } = evaluateGate(
      baselineMetrics,
      candidateMetrics,
      minEvents,
      maxErrorRateDelta,
      maxP95LatencyDeltaPct,
      maxAvgTokensDeltaPct,
    );

    // Only proceed with rollback if gate FAILED
    if (decision !== 'FAIL') {
      logger.info('frank_rollback_rejected', {
        tenantId,
        baseline,
        candidate,
        decision,
        reason: `gate_decision_${decision}`,
      });

      return NextResponse.json(
        {
          ok: false,
          error: `Cannot rollback: gate decision is ${decision}, not FAIL`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // Get current override
    const currentOverride = await getTenantOverride(tenantId);

    // Determine rollback action
    let newOverride: string | null;
    if (currentOverride === candidate) {
      // If tenant is currently on the candidate, reset to baseline
      newOverride = baseline;
    } else if (currentOverride) {
      // If tenant has some other override, clear it
      newOverride = null;
    } else {
      // No override currently, no-op but return success
      newOverride = null;
    }

    // Apply rollback (unless dryRun)
    let applied = false;
    if (!dryRun) {
      if (newOverride === null) {
        applied = await clearTenantOverride(tenantId, `rollback: ${candidate} -> ${baseline}`);
      } else {
        applied = await setTenantOverride(tenantId, newOverride, `rollback: ${candidate} -> ${baseline}`);
      }
    }

    const response: RollbackResponse = {
      ok: true,
      applied: applied || dryRun, // Consider dryRun as "applied" (just not persisted)
      previousOverride: currentOverride || null,
      newOverride: newOverride,
      decision,
      reasons,
      dryRun,
      timestamp: new Date().toISOString(),
    };

    logger.info('frank_rollback_applied', {
      tenantId,
      baseline,
      candidate,
      previousOverride: currentOverride,
      newOverride,
      dryRun,
      applied,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('frank_rollback_failed', error instanceof Error ? error : new Error(String(error)), {
      tenantId,
      baseline,
      candidate,
      sinceHours,
    });

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to apply rollback',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export const POST = withRequestTrace(handler);
