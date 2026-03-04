export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken } from '../../../../../infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse } from '../../../../../infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '../../../../../infra/http/request-trace';
import { structuredLogger } from '../../../../../infra/log/logger';
import { runFinopsReconciliation } from '../../../../../modules/jobs/finops-reconciliation.worker';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const startedAt = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/internal/jobs/finops-reconciliation';

    structuredLogger.info('internal_finops_reconciliation_start', {
        requestId,
        route,
        eventType: 'internal_job_start',
    });

    try {
        const authResult = requireInternalToken(request, { purpose: ['jobs'] });
        if (!authResult.ok) return errorResponse(ErrorCode.AUTH_REQUIRED, 401, requestId, 'Unauthorized');

        const result = await runFinopsReconciliation({ requestId });

        const response = NextResponse.json(
            {
                ok: true,
                eventsProcessed: result.eventsProcessed,
                tenantsUpdated: result.tenantsUpdated,
                durationMs: result.durationMs,
                errors: result.errors,
            },
            { status: 200 }
        );
        attachRequestIdHeader(response, requestId);

        structuredLogger.info('internal_finops_reconciliation_end', {
            requestId,
            route,
            eventType: 'internal_job_end',
            eventsProcessed: result.eventsProcessed,
            tenantsUpdated: result.tenantsUpdated,
            durationMs: Date.now() - startedAt,
            errors: result.errors.length,
            status: 200,
            outcome: 'ok',
        });

        return response;
    } catch (error) {
        structuredLogger.error('internal_finops_reconciliation_failed', {
            requestId,
            route,
            eventType: 'internal_job_error',
            durationMs: Date.now() - startedAt,
            error,
        });
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, (error as Error).message || 'Worker failed');
    }
}
