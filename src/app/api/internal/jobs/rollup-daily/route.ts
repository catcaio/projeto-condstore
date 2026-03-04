export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken } from '../../../../../infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse } from '../../../../../infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { structuredLogger } from '../../../../../infra/log/logger';
import { runDailyMetricsRollup } from '../../../../../modules/metrics/rollup-daily.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/internal/jobs/rollup-daily';

  structuredLogger.info('internal_rollup_daily_start', {
    requestId,
    route,
    eventType: 'internal_job_start',
  });

  try {
    const authResult = requireInternalToken(request, { purpose: ['jobs'] });
    if (!authResult.ok) return errorResponse(ErrorCode.AUTH_REQUIRED, 401, requestId, 'Unauthorized');

    let body: { day?: string } = {};
    try {
      const raw = await request.text();
      if (raw.trim()) {
        body = JSON.parse(raw) as { day?: string };
      }
    } catch {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON body');
    }

    const result = await runDailyMetricsRollup({
      day: body.day,
      requestId,
    });

    const response = NextResponse.json({ ok: true, ...result }, { status: 200 });
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('internal_rollup_daily_end', {
      requestId,
      route,
      eventType: 'internal_job_end',
      day: result.day,
      rowsWritten: result.rowsWritten,
      durationMs: Date.now() - startedAt,
      status: 200,
      outcome: 'ok',
    });
    return response;
  } catch (error) {
    const message = (error as Error).message;
    const code = message.includes('YYYY-MM-DD') ? ErrorCode.VALIDATION_ERROR : ErrorCode.DB_ERROR;
    const status = code === ErrorCode.VALIDATION_ERROR ? 400 : 500;

    structuredLogger.error('internal_rollup_daily_failed', {
      requestId,
      route,
      eventType: 'internal_job_error',
      errorCode: code,
      durationMs: Date.now() - startedAt,
      error,
    });
    return errorResponse(code, status, requestId, message || 'Rollup daily failed');
  }
}
