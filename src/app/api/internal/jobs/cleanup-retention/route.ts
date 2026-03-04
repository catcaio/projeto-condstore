export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken } from '../../../../../infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse } from '../../../../../infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { structuredLogger } from '../../../../../infra/log/logger';
import { adminAuditLogRepository } from '../../../../../infra/repositories/admin-audit-log.repository';
import { runRetentionCleanup } from '../../../../../modules/metrics/retention-cleanup.service';

const INTERNAL_AUDIT_TENANT_ID = 'internal-system';
const INTERNAL_AUDIT_USER_ID = 'internal-job';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const requestId = makeRequestId(request);
  const route = '/api/internal/jobs/cleanup-retention';

  try {
    const authResult = requireInternalToken(request, { purpose: ['jobs'] });
    if (!authResult.ok) return errorResponse(ErrorCode.AUTH_REQUIRED, 401, requestId, 'Unauthorized');

    const result = await runRetentionCleanup({ requestId });
    await adminAuditLogRepository.log({
      tenantId: INTERNAL_AUDIT_TENANT_ID,
      userId: INTERNAL_AUDIT_USER_ID,
      action: 'ops.cleanup_retention',
      metadata: {
        requestId,
        totalDeleted: result.totalDeleted,
        tables: result.tables,
      },
    });

    const response = NextResponse.json({ ok: true, ...result }, { status: 200 });
    attachRequestIdHeader(response, requestId);
    structuredLogger.info('internal_cleanup_retention_end', {
      requestId,
      route,
      eventType: 'internal_job_end',
      totalDeleted: result.totalDeleted,
      durationMs: Date.now() - startedAt,
      status: 200,
      outcome: 'ok',
    });
    return response;
  } catch (error) {
    structuredLogger.error('internal_cleanup_retention_failed', {
      requestId,
      route,
      eventType: 'internal_job_error',
      errorCode: ErrorCode.DB_ERROR,
      durationMs: Date.now() - startedAt,
      error,
    });
    return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Cleanup retention failed');
  }
}
