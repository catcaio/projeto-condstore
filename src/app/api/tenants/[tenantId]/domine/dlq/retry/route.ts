import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '../../../../../../../infra/http/error-response';
import { makeRequestId } from '../../../../../../../infra/http/request-trace';
import { requireSessionTenantMatch } from '../../../../../../../infra/auth/tenant-route-guard';
import { domineEventsRepository } from '../../../../../../../infra/repositories/domine-events.repository';

export async function POST(request: NextRequest, { params }: { params: { tenantId: string } }) {
    const requestId = makeRequestId(request);

    // Auth & Permission check
    const auth = await requireSessionTenantMatch(request, params.tenantId);
    if (!auth.ok) {
        return auth.response;
    }
    if (auth.sessionUser?.role !== 'admin' && auth.sessionUser?.role !== 'owner') {
        return errorResponse("FORBIDDEN" as any, 403, requestId, "Admin required");
    }

    const { tenantId } = params;

    try {
        const body = await request.json().catch(() => ({}));

        if (!body.eventId || typeof body.eventId !== 'string') {
            return errorResponse("VALIDATION_ERROR" as any, 400, requestId, "Missing or invalid eventId");
        }

        const resetSuccess = await domineEventsRepository.resetDLQEvent(body.eventId, tenantId);

        if (!resetSuccess) {
            return errorResponse("NOT_FOUND" as any, 404, requestId, "Event not found in DLQ for this tenant");
        }

        return NextResponse.json({
            ok: true,
            eventId: body.eventId,
            status: "re-queued"
        });
    } catch (e: any) {
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId, e.message);
    }
}
