import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, getAuthContext } from '@/infra/auth/tenant-route-guard';
import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';

async function _GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string  }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    const guard = await getAuthContext(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    try {
        const events = await domineEventsRepository.listEvents(guard.tenantId, {
            type,
            status,
            limit,
            offset,
        });

        return NextResponse.json({ data: events });
    } catch (e: any) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 500, requestId, e.message);
    }
}

export const GET = withGlobalErrorInterceptor(_GET);
