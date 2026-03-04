export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken } from '../../../../../infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse } from '../../../../../infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { structuredLogger } from '../../../../../infra/log/logger';
import { adminAuditLogRepository } from '../../../../../infra/repositories/admin-audit-log.repository';
import { backfillPhonePii } from '../../../../../modules/jobs/backfillPhonePii';

interface BackfillPhoneBody {
  batchSize?: number;
  maxBatches?: number;
}

const INTERNAL_AUDIT_TENANT_ID = 'internal-system';
const INTERNAL_AUDIT_USER_ID = 'internal-job';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/internal/jobs/backfill-phone';

  try {
    const authResult = requireInternalToken(request, { purpose: ['jobs'] });
    if (!authResult.ok) return errorResponse(ErrorCode.AUTH_REQUIRED, 401, requestId, 'Unauthorized');

    let body: BackfillPhoneBody = {};
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        body = (await request.json()) as BackfillPhoneBody;
      } catch {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid JSON body');
      }
    }

    const result = await backfillPhonePii({
      requestId,
      batchSize: body.batchSize,
      maxBatches: body.maxBatches,
    });

    await adminAuditLogRepository.log({
      tenantId: INTERNAL_AUDIT_TENANT_ID,
      userId: INTERNAL_AUDIT_USER_ID,
      action: 'ops.backfill_phone_pii',
      metadata: {
        requestId,
        batchSize: result.batchSize,
        maxBatches: result.maxBatches,
        batchesRun: result.batchesRun,
        messagesUpdated: result.messagesUpdated,
        funnelEventsUpdated: result.funnelEventsUpdated,
        skippedRows: result.skippedRows,
        hasMore: result.hasMore,
      },
    });

    const response = NextResponse.json({ ok: true, ...result }, { status: 200 });
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('internal_backfill_phone_pii_end', {
      requestId,
      route,
      eventType: 'internal_job_end',
      durationMs: Date.now() - startedAt,
      status: 200,
      outcome: 'ok',
      messagesUpdated: result.messagesUpdated,
      funnelEventsUpdated: result.funnelEventsUpdated,
      skippedRows: result.skippedRows,
      hasMore: result.hasMore,
    });
    return response;
  } catch (error) {
    structuredLogger.error('internal_backfill_phone_pii_failed', {
      requestId,
      route,
      eventType: 'internal_job_error',
      errorCode: ErrorCode.DB_ERROR,
      durationMs: Date.now() - startedAt,
      error,
    });
    return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Phone PII backfill failed');
  }
}
