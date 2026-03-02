import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../infra/auth/guards';
import { ErrorCode, errorResponse, inferErrorCodeFromStatus } from '../../../../../infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { structuredLogger } from '../../../../../infra/log/logger';
import { logger } from '../../../../../infra/logger';
import { adminAuditLogRepository } from '../../../../../infra/repositories/admin-audit-log.repository';
import { tenantRepository } from '../../../../../infra/repositories/tenant.repository';
import { redisClient } from '../../../../../infra/redis.client';
import { normalizeTenantTimeZone } from '../../../../../infra/time/window';
import { runDailyMetricsRollup } from '../../../../../modules/metrics/rollup-daily.service';
import { metricsRollupStatusRepository } from '../../../../../modules/metrics/metrics-rollup-status.repository';

export const runtime = 'nodejs';

interface RunRollupBody {
  day?: string;
}

function statusCacheKey(tenantId: string): string {
  return `cockpit:ops:status:${tenantId}`;
}

async function _POST(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/cockpit/ops/run-rollup';
  let tenantId: string | undefined;
  let userId: string | undefined;

  structuredLogger.info('cockpit_ops_run_rollup_start', {
    requestId,
    route,
    eventType: 'route_start',
  });

  const finalize = (response: NextResponse, code?: ErrorCode) => {
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('cockpit_ops_run_rollup_end', {
      requestId,
      tenantId,
      userId,
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
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return finalize(auth.response, auth.code);

    tenantId = auth.session.tenantId;
    userId = auth.session.sub;

    let body: RunRollupBody = {};
    try {
      const raw = await request.text();
      if (raw.trim()) {
        body = JSON.parse(raw) as RunRollupBody;
      }
    } catch {
      return finalize(errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON body'), ErrorCode.VALIDATION_ERROR);
    }

    const result = await runDailyMetricsRollup({
      day: body.day,
      tenantId,
      requestId,
    });

    if (result.lockBusy) {
      const response = errorResponse(
        ErrorCode.LOCK_BUSY,
        409,
        requestId,
        'Rollup already running for this tenant/day',
        { tenantId, day: result.day },
      );
      response.headers.set('Retry-After', '60');
      return finalize(response, ErrorCode.LOCK_BUSY);
    }

    const [tenant, status] = await Promise.all([
      tenantRepository.getTenantById(tenantId),
      metricsRollupStatusRepository.getByTenant(tenantId),
      redisClient.del(statusCacheKey(tenantId)),
      adminAuditLogRepository.log({
        tenantId,
        userId,
        action: 'ops.run_rollup',
        metadata: {
          requestId,
          dayRequested: body.day ?? null,
          dayProcessed: result.day,
          rowsWritten: result.rowsWritten,
          durationMs: result.durationMs,
        },
      }),
    ]);

    const response = NextResponse.json({
      ok: true,
      tenantId,
      timezone: normalizeTenantTimeZone(tenant?.timezone),
      result,
      rollup_status: status ? {
        last_day_processed: status.lastDayProcessed ?? null,
        last_run_at: status.lastRunAt ?? null,
        last_duration_ms: status.lastDurationMs ?? null,
        last_rows_written: status.lastRowsWritten ?? null,
        status: status.status,
        last_error_code: status.lastErrorCode ?? null,
      } : null,
    }, { status: 200 });

    return finalize(response);
  } catch (error) {
    const message = (error as Error).message || 'Failed to run rollup';
    const code = message.includes('YYYY-MM-DD') ? ErrorCode.VALIDATION_ERROR : ErrorCode.DB_ERROR;
    const status = code === ErrorCode.VALIDATION_ERROR ? 400 : 500;

    logger.error('cockpit/ops/run-rollup failed', error as Error, { tenantId, userId });
    structuredLogger.error('cockpit_ops_run_rollup_failed', {
      requestId,
      tenantId,
      userId,
      route,
      eventType: 'route_error',
      durationMs: Date.now() - startedAt,
      errorCode: code,
      error,
    });
    return finalize(errorResponse(code, status, requestId, message), code);
  }
}

export const POST = withGlobalErrorInterceptor(_POST);
