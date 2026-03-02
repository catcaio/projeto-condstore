import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '../../../../infra/db';
import { requireAdmin } from '../../../../infra/auth/guards';
import { logger } from '../../../../infra/logger';
import { structuredLogger } from '../../../../infra/log/logger';
import { redisClient } from '../../../../infra/redis.client';
import { attachRequestIdHeader, makeRequestId } from '../../../../infra/http/request-trace';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '../../../../infra/http/error-response';
import { buildFinOpsPayload, type FinOpsPayload, type RawBudgetRow, type UsageEventRow } from '../../../../modules/finops/finops-budget.service';

const CACHE_TTL_SECONDS = 30;

export function finopsCacheKey(tenantId: string): string {
    return `cockpit:finops:${tenantId}`;
}

async function _GET(request: NextRequest): Promise<NextResponse> {
    const startedAt = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/cockpit/finops';
    let tenantId = 'unknown';

    structuredLogger.info('cockpit_finops_start', { requestId, route, eventType: 'route_start' });

    const finalize = (response: NextResponse, code?: ErrorCode) => {
        attachRequestIdHeader(response, requestId);
        structuredLogger.info('cockpit_finops_end', {
            requestId,
            tenantId: tenantId !== 'unknown' ? tenantId : undefined,
            route,
            eventType: 'route_end',
            durationMs: Date.now() - startedAt,
            status: response.status,
            outcome: response.status >= 400 ? 'error' : 'ok',
            errorCode: code ?? (response.status >= 400 ? inferErrorCodeFromStatus(response.status) : undefined),
        });
        return response;
    };

    try {
        // ── Auth ────────────────────────────────────────────────────────────────────
        const auth = await requireAdmin(request, { requestId });
        if (!auth.ok) return finalize(auth.response, auth.code);

        tenantId = auth.session.tenantId;
        const cacheKey = finopsCacheKey(tenantId);

        // ── Cache read (Redis, TTL 30 s) ────────────────────────────────────────────
        try {
            if (redisClient.isAvailable()) {
                const cached = await redisClient.get<FinOpsPayload>(cacheKey);
                if (cached) {
                    logger.info('cockpit/finops: cache_hit', { tenantId });
                    return finalize(NextResponse.json(cached, {
                        status: 200,
                        headers: { 'Cache-Control': 'private, max-age=30' },
                    }));
                }
            }
        } catch (err) {
            logger.warn('cockpit/finops: cache read failed', { tenantId, error: (err as Error).message });
        }

        // ── DB queries ──────────────────────────────────────────────────────────────
        const db = await getDb();

        const [budgetResult, recentEventsResult] = await Promise.all([
            // tenant_budgets snapshot
            db.execute(sql`
        SELECT
          current_lock_state,
          monthly_budget_usd,
          soft_limit_percent,
          hard_limit_percent,
          current_month_usd,
          burn_rate_per_day as burnRatePerDay,
          monthly_token_limit as monthlyTokenLimit,
          tokens_consumed as tokensConsumed,
          last_budget_reset_at as lastBudgetResetAt
        FROM tenant_budgets
        WHERE tenant_id = ${tenantId}
        LIMIT 1
      `),

            // Last-7-days usage events for savings estimate
            db.execute(sql`
        SELECT model_used, input_tokens, output_tokens
        FROM token_usage_events
        WHERE tenant_id = ${tenantId}
          AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
      `),
        ]);

        // Unwrap MySQL2 result tuples  [rows, fields] | rows
        const budgetRows = (Array.isArray(budgetResult)
            ? budgetResult[0]
            : budgetResult) as unknown as RawBudgetRow[];
        const eventRows = (Array.isArray(recentEventsResult)
            ? recentEventsResult[0]
            : recentEventsResult) as unknown as UsageEventRow[];

        // No budget row yet → brand-new tenant, return zeroed payload
        const budgetRow: RawBudgetRow = budgetRows[0] ?? {
            currentLockState: 'unlocked',
            monthlyBudgetUsd: 0,
            softLimitPercent: 80,
            hardLimitPercent: 100,
            currentMonthUsd: 0,
            burnRatePerDay: null,
            monthlyTokenLimit: 1_000_000,
            tokensConsumed: 0,
            lastBudgetResetAt: new Date(),
        };

        const payload = buildFinOpsPayload(budgetRow, eventRows ?? []);

        // ── Cache write ─────────────────────────────────────────────────────────────
        try {
            if (redisClient.isAvailable()) {
                void redisClient.set<FinOpsPayload>(cacheKey, payload, CACHE_TTL_SECONDS);
            }
        } catch { /* non-critical */ }

        logger.info('cockpit/finops: ok', {
            tenantId,
            state: payload.state,
            percentUsed: payload.percentUsed,
            projectedDays: payload.projectedDaysToHardLimit,
        });

        return finalize(NextResponse.json(payload, {
            status: 200,
            headers: { 'Cache-Control': 'private, max-age=30' },
        }));
    } catch (error) {
        logger.error('cockpit/finops: unexpected error', error as Error, { tenantId });
        structuredLogger.error('cockpit_finops_failed', {
            requestId,
            tenantId: tenantId !== 'unknown' ? tenantId : undefined,
            route,
            eventType: 'route_error',
            durationMs: Date.now() - startedAt,
            errorCode: ErrorCode.DB_ERROR,
        });
        return finalize(errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Internal server error'), ErrorCode.DB_ERROR);
    }
}

export const GET = withGlobalErrorInterceptor(_GET);
