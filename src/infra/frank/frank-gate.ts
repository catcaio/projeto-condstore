import { and, eq, gte, sql } from 'drizzle-orm';
import { frankEvents } from '@/drizzle/schema';
import { getDb } from '@/infra/db';

export interface ModelMetrics {
  modelVersionId: string;
  count: number;
  avgLatencyMs: number | null;
  avgTokensPrompt: number | null;
  avgTokensCompletion: number | null;
  errorRate: number;
}

export interface GateThresholds {
  minEvents: number;
  maxErrorRateDelta: number;
  maxP95LatencyDeltaPct: number;
  maxAvgTokensDeltaPct: number;
}

export interface GateResult {
  decision: 'PASS' | 'FAIL' | 'INSUFFICIENT_DATA';
  reasons: string[];
  thresholds: GateThresholds;
  metrics: {
    baseline: ModelMetrics | null;
    candidate: ModelMetrics | null;
  };
  timestamp: string;
}

function getThresholds(): GateThresholds {
  return {
    minEvents: Number.parseInt(process.env.FRANK_GATE_MIN_EVENTS || '50', 10),
    maxErrorRateDelta: Number.parseFloat(process.env.FRANK_GATE_MAX_ERROR_RATE_DELTA || '0.01'),
    maxP95LatencyDeltaPct: Number.parseFloat(process.env.FRANK_GATE_MAX_P95_LATENCY_DELTA_PCT || '0.20'),
    maxAvgTokensDeltaPct: Number.parseFloat(process.env.FRANK_GATE_MAX_AVG_TOKENS_DELTA_PCT || '0.15'),
  };
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
    modelVersionId,
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
  thresholds: GateThresholds,
): { decision: 'PASS' | 'FAIL' | 'INSUFFICIENT_DATA'; reasons: string[] } {
  const reasons: string[] = [];

  if (!baseline) {
    reasons.push('Baseline model has no events in the window');
    return { decision: 'INSUFFICIENT_DATA', reasons };
  }

  if (!candidate) {
    reasons.push('Candidate model has no events in the window');
    return { decision: 'INSUFFICIENT_DATA', reasons };
  }

  if (baseline.count < thresholds.minEvents) {
    reasons.push(`Baseline event count (${baseline.count}) below minimum (${thresholds.minEvents})`);
  }

  if (candidate.count < thresholds.minEvents) {
    reasons.push(`Candidate event count (${candidate.count}) below minimum (${thresholds.minEvents})`);
  }

  if (reasons.length > 0) {
    return { decision: 'INSUFFICIENT_DATA', reasons };
  }

  const errorRateDelta = Math.abs(candidate.errorRate - baseline.errorRate);
  if (errorRateDelta > thresholds.maxErrorRateDelta) {
    reasons.push(
      `Error rate delta ${(errorRateDelta * 100).toFixed(2)}pp exceeds threshold ${(thresholds.maxErrorRateDelta * 100).toFixed(2)}pp ` +
        `(baseline: ${baseline.errorRate.toFixed(2)}%, candidate: ${candidate.errorRate.toFixed(2)}%)`,
    );
  }

  if (baseline.avgLatencyMs !== null && candidate.avgLatencyMs !== null) {
    const latencyDeltaPct = ((candidate.avgLatencyMs - baseline.avgLatencyMs) / baseline.avgLatencyMs) * 100;
    if (latencyDeltaPct > thresholds.maxP95LatencyDeltaPct * 100) {
      reasons.push(
        `Avg latency increase ${latencyDeltaPct.toFixed(2)}% exceeds threshold ${(thresholds.maxP95LatencyDeltaPct * 100).toFixed(2)}% ` +
          `(baseline: ${baseline.avgLatencyMs.toFixed(2)}ms, candidate: ${candidate.avgLatencyMs.toFixed(2)}ms)`,
      );
    }
  }

  if (baseline.avgTokensPrompt !== null && candidate.avgTokensPrompt !== null) {
    const tokensDeltaPct = ((candidate.avgTokensPrompt - baseline.avgTokensPrompt) / baseline.avgTokensPrompt) * 100;
    if (tokensDeltaPct > thresholds.maxAvgTokensDeltaPct * 100) {
      reasons.push(
        `Avg tokens increase ${tokensDeltaPct.toFixed(2)}% exceeds threshold ${(thresholds.maxAvgTokensDeltaPct * 100).toFixed(2)}% ` +
          `(baseline: ${baseline.avgTokensPrompt.toFixed(2)}, candidate: ${candidate.avgTokensPrompt.toFixed(2)})`,
      );
    }
  }

  const decision = reasons.length === 0 ? 'PASS' : 'FAIL';
  return { decision, reasons };
}

export async function gateEvaluate(
  db: Awaited<ReturnType<typeof getDb>>,
  {
    tenantId,
    baseline,
    candidate,
    sinceHours = 24,
  }: {
    tenantId: string;
    baseline: string;
    candidate: string;
    sinceHours?: number;
  },
): Promise<GateResult> {
  const since = new Date(Date.now() - Math.max(1, sinceHours) * 3600 * 1000);
  const thresholds = getThresholds();

  const [baselineMetrics, candidateMetrics] = await Promise.all([
    getModelMetrics(db, tenantId, baseline, since),
    getModelMetrics(db, tenantId, candidate, since),
  ]);

  const { decision, reasons } = evaluateGate(baselineMetrics, candidateMetrics, thresholds);

  return {
    decision,
    reasons,
    thresholds,
    metrics: {
      baseline: baselineMetrics,
      candidate: candidateMetrics,
    },
    timestamp: new Date().toISOString(),
  };
}

