import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    const guard = await requireSessionTenantMatch(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    try {
        const body = await req.json();
        const dlqEntryId = body.dlqEntryId;

        if (!dlqEntryId || typeof dlqEntryId !== 'string') {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'dlqEntryId is required');
        }

        const retried = await domineEventsRepository.retryFromDLQ(guard.tenantId, dlqEntryId);

        if (!retried) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'DLQ entry not found');
        }

        structuredLogger.info('domine_dlq_retry', {
            tenantId: guard.tenantId,
            dlqEntryId,
            requestId,
        });

        return NextResponse.json({ ok: true, retried: true });
    } catch (e: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, e.message);
    }
}
