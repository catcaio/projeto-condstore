import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, getAuthContext } from '@/infra/auth/tenant-route-guard';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { adminAuditLogRepository } from '@/infra/repositories/admin-audit-log.repository';
import { tenantIncidentsRepository } from '@/infra/repositories/tenant-incidents.repository';

async function _GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string  }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    const guard = await getAuthContext(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'admin'; // 'admin' | 'incident'
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Filters
    const actionFilter = searchParams.get('action') || undefined;
    const userFilter = searchParams.get('userId') || undefined;

    try {
        if (type === 'admin') {
            const data = await adminAuditLogRepository.list(guard.tenantId, {
                page,
                limit,
                action: actionFilter,
                userId: userFilter,
            });
            return NextResponse.json({ data });
        } else {
            const data = await tenantIncidentsRepository.list(guard.tenantId, {
                page,
                limit,
                type: actionFilter,     // actionFilter on incidents maps to `type`
                triggeredBy: userFilter,
            });
            return NextResponse.json({ data });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export const GET = withGlobalErrorInterceptor(_GET);
