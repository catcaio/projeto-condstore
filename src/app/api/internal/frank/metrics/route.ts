export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, sql, desc } from 'drizzle-orm';
import { frankEvents } from '@/drizzle/schema';
import { getDb } from '@/infra/db';
import { logger } from '@/infra/logger';
import { getInternalExportTokenOrThrow, isInternalTokenAuthorized } from '@/infra/config/internal-token';
import { withRequestTrace } from '@/infra/http/request-trace';

interface MetricsRow {
  model_version_id: string | null;
  rollout_source: string | null;
  count: number;
  avg_latency_ms: number | null;
  error_count: number;
  avg_tokens_prompt: number | null;
  avg_tokens_completion: number | null;
}

async function handler(request: NextRequest): Promise<NextResponse> {
  try {
    getInternalExportTokenOrThrow();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'INTERNAL_EXPORT_TOKEN not configured' },
      { status: 500 },
    );
  }

  const token = request.headers.get('x-internal-token');
  if (!isInternalTokenAuthorized(token)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: 'tenantId is required' }, { status: 400 });
  }

  const sinceHours = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('sinceHours') || '24', 10));

  try {
    const db = await getDb();
    const since = new Date(Date.now() - sinceHours * 3600 * 1000);

    // Aggregate metrics by modelVersionId
    const metricsRows = await db
      .select({
        model_version_id: sql<string>`
          JSON_EXTRACT(${frankEvents.payloadJson}, '$.modelVersionId')
        `,
        rollout_source: sql<string>`
          JSON_EXTRACT(${frankEvents.payloadJson}, '$.rolloutSource')
        `,
        count: sql<number>`COUNT(*)`,
        avg_latency_ms: sql<number>`AVG(${frankEvents.latencyMs})`,
        error_count: sql<number>`SUM(CASE WHEN ${frankEvents.latencyMs} IS NULL THEN 1 ELSE 0 END)`,
        avg_tokens_prompt: sql<number>`AVG(${frankEvents.tokensPrompt})`,
        avg_tokens_completion: sql<number>`AVG(${frankEvents.tokensCompletion})`,
      })
      .from(frankEvents)
      .where(and(
        eq(frankEvents.tenantId, tenantId),
        gte(frankEvents.createdAt, since),
      ))
      .groupBy(
        sql`JSON_EXTRACT(${frankEvents.payloadJson}, '$.modelVersionId')`,
        sql`JSON_EXTRACT(${frankEvents.payloadJson}, '$.rolloutSource')`,
      )
      .orderBy(desc(sql`COUNT(*)`));

    // Get total counts
    const [totalsRow] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        error_count: sql<number>`SUM(CASE WHEN ${frankEvents.latencyMs} IS NULL THEN 1 ELSE 0 END)`,
      })
      .from(frankEvents)
      .where(and(
        eq(frankEvents.tenantId, tenantId),
        gte(frankEvents.createdAt, since),
      ));

    const totalEvents = totalsRow?.total ?? 0;
    const totalErrors = totalsRow?.error_count ?? 0;

    // Build response structure
    interface ModelVersionMetrics {
      modelVersionId: string;
      rolloutSourceBreakdown: Record<string, number>;
      avgLatencyMs: number | null;
      p95LatencyMs: number | null;
      avgTokensPrompt: number | null;
      avgTokensCompletion: number | null;
      errorRate: number;
      count: number;
    }

    const byModelVersion = new Map<string, ModelVersionMetrics>();

    for (const row of metricsRows) {
      const modelVersionId = row.model_version_id || 'unknown';
      const rolloutSource = row.rollout_source || 'unknown';

      if (!byModelVersion.has(modelVersionId)) {
        byModelVersion.set(modelVersionId, {
          modelVersionId,
          rolloutSourceBreakdown: {},
          avgLatencyMs: row.avg_latency_ms ? Math.round(row.avg_latency_ms * 100) / 100 : null,
          p95LatencyMs: null, // Would require percentile calculation
          avgTokensPrompt: row.avg_tokens_prompt ? Math.round(row.avg_tokens_prompt * 100) / 100 : null,
          avgTokensCompletion: row.avg_tokens_completion ? Math.round(row.avg_tokens_completion * 100) / 100 : null,
          errorRate: row.count > 0 ? Math.round((row.error_count / row.count) * 10000) / 100 : 0,
          count: row.count,
        });
      }

      const metrics = byModelVersion.get(modelVersionId)!;
      metrics.rolloutSourceBreakdown[rolloutSource] = row.count;
    }

    return NextResponse.json({
      ok: true,
      tenantId,
      sinceHours,
      totals: {
        events: totalEvents,
        errors: totalErrors,
        errorRate: totalEvents > 0 ? Math.round((totalErrors / totalEvents) * 10000) / 100 : 0,
      },
      byModelVersion: Array.from(byModelVersion.values()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('frank_metrics_failed', error instanceof Error ? error : new Error(String(error)), {
      tenantId,
      sinceHours,
    });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to compute metrics',
      },
      { status: 500 },
    );
  }
}

export const GET = withRequestTrace(handler);
