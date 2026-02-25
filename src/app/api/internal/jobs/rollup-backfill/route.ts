export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalExportTokenOrThrow, isInternalTokenAuthorized } from '../../../../../infra/config/internal-token';
import { ErrorCode, errorResponse } from '../../../../../infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { structuredLogger } from '../../../../../infra/log/logger';
import { adminAuditLogRepository } from '../../../../../infra/repositories/admin-audit-log.repository';
import { runRollupBackfill } from '../../../../../modules/metrics/rollup-daily.service';

interface BackfillBody {
  from?: string;
  to?: string;
}

const INTERNAL_AUDIT_TENANT_ID = 'internal-system';
const INTERNAL_AUDIT_USER_ID = 'internal-job';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/internal/jobs/rollup-backfill';

  try {
    try {
      getInternalExportTokenOrThrow();
    } catch {
      return errorResponse(ErrorCode.AUTH_REQUIRED, 500, requestId, 'INTERNAL_EXPORT_TOKEN not configured');
    }

    const token = request.headers.get('x-internal-token');
    if (!isInternalTokenAuthorized(token)) {
      return errorResponse(ErrorCode.AUTH_REQUIRED, 401, requestId, 'Unauthorized');
    }

    let body: BackfillBody;
    try {
      body = (await request.json()) as BackfillBody;
    } catch {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON body');
    }

    if (!body?.from || !body?.to) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'from and to are required');
    }

    const result = await runRollupBackfill({
      from: body.from,
      to: body.to,
      requestId,
    });
    await adminAuditLogRepository.log({
      tenantId: INTERNAL_AUDIT_TENANT_ID,
      userId: INTERNAL_AUDIT_USER_ID,
      action: 'ops.rollup_backfill',
      metadata: {
        requestId,
        from: result.from,
        to: result.to,
        daysProcessed: result.daysProcessed,
        rowsWritten: result.rowsWritten,
      },
    });

    const response = NextResponse.json({ ok: true, ...result }, { status: 200 });
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('internal_rollup_backfill_end', {
      requestId,
      route,
      eventType: 'internal_job_end',
      from: result.from,
      to: result.to,
      daysProcessed: result.daysProcessed,
      rowsWritten: result.rowsWritten,
      durationMs: Date.now() - startedAt,
      status: 200,
      outcome: 'ok',
    });
    return response;
  } catch (error) {
    const message = (error as Error).message || 'Rollup backfill failed';
    const code = message === 'range_too_large' || message.includes('YYYY-MM-DD') || message.includes('from must be <= to')
      ? ErrorCode.VALIDATION_ERROR
      : ErrorCode.DB_ERROR;
    const status = code === ErrorCode.VALIDATION_ERROR ? 400 : 500;

    structuredLogger.error('internal_rollup_backfill_failed', {
      requestId,
      route,
      eventType: 'internal_job_error',
      errorCode: code,
      durationMs: Date.now() - startedAt,
      error,
    });

    return errorResponse(
      code,
      status,
      requestId,
      message === 'range_too_large' ? 'Max 31 days per request' : message,
    );
  }
}
