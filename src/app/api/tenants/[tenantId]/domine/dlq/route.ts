import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '../../../../../../infra/http/error-response';
import { makeRequestId } from '../../../../../../infra/http/request-trace';
import { requireSessionTenantMatch } from '../../../../../../infra/auth/tenant-route-guard';
import { domineEventsRepository } from '../../../../../../infra/repositories/domine-events.repository';

export async function GET(request: NextRequest, { params }: { params: { tenantId: string } }) {
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

    const limitStr = request.nextUrl.searchParams.get('limit') || '50';
    const offsetStr = request.nextUrl.searchParams.get('offset') || '0';

    const limit = parseInt(limitStr, 10);
    const offset = parseInt(offsetStr, 10);

    if (isNaN(limit) || isNaN(offset)) {
        return errorResponse("VALIDATION_ERROR" as any, 400, requestId, "Invalid limit or offset");
    }

    try {
        const events = await domineEventsRepository.listDLQEvents(tenantId, limit, offset);
        const count = await domineEventsRepository.getDLQCount(tenantId);

        return NextResponse.json({
            ok: true,
            data: events,
            meta: {
                total: count,
                limit,
                offset
            }
        });
    } catch (e: any) {
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId, e.message);
    }
}
