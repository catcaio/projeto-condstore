import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    const guard = await requireSessionTenantMatch(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    try {
        const entries = await domineEventsRepository.listDLQ(guard.tenantId, limit, offset);
        const count = await domineEventsRepository.getDLQCount(guard.tenantId);

        return NextResponse.json({ data: entries, total: count, page, limit });
    } catch (e: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, e.message);
    }
}
