export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken } from '../../../../../infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse } from '../../../../../infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { structuredLogger } from '../../../../../infra/log/logger';
import { adminAuditLogRepository } from '../../../../../infra/repositories/admin-audit-log.repository';
import { runDataRetentionPurge } from '../../../../../infra/jobs/data-retention.job';
import { withDistributedLock } from '../../../../../lib/http/with-distributed-lock';
import { jobLock } from '../../../../../lib/infra/lock-keys';

const INTERNAL_AUDIT_TENANT_ID = 'internal-system';
const INTERNAL_AUDIT_USER_ID = 'internal-job';

async function postHandler(request: NextRequest): Promise<NextResponse> {
    const startedAt = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/internal/jobs/data-retention';

    try {
        const authResult = requireInternalToken(request, { purpose: ['jobs'] });
        if (!authResult.ok) return errorResponse(ErrorCode.AUTH_REQUIRED, 401, requestId, 'Unauthorized');

        const result = await runDataRetentionPurge({ requestId });

        await adminAuditLogRepository.log({
            tenantId: INTERNAL_AUDIT_TENANT_ID,
            userId: INTERNAL_AUDIT_USER_ID,
            action: 'ops.data_retention_purge',
            metadata: {
                requestId,
                recordsScanned: result.recordsScanned,
                recordsPurged: result.recordsPurged,
                durationMs: result.durationMs,
                tables: result.tables,
                reachedLimit: result.reachedLimit,
            },
        });

        const response = NextResponse.json({ ok: true, ...result }, { status: 200 });
        attachRequestIdHeader(response, requestId);

        structuredLogger.info('internal_data_retention_end', {
            requestId,
            route,
            eventType: 'internal_job_end',
            durationMs: Date.now() - startedAt,
            status: 200,
            outcome: 'ok',
        });

        return response;
    } catch (error) {
        structuredLogger.error('internal_data_retention_failed', {
            requestId,
            route,
            eventType: 'internal_job_error',
            errorCode: ErrorCode.DB_ERROR,
            durationMs: Date.now() - startedAt,
            error,
        });
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Data retention purge failed');
    }
}

export const POST = withDistributedLock(() => jobLock('data-retention'), 600, postHandler);
