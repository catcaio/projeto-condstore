import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { domineReadRepository } from '@/infra/repositories/domine-read.repository';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { getInternalExportTokenOrThrow } from '@/infra/config/internal-token';

export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string, orderId: string  }> }) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    const authHeaders = req.headers.get('authorization');
    let isAuthorized = false;

    // Check internal token
    try {
        const token = getInternalExportTokenOrThrow();
        if (authHeaders === `Bearer ${token}`) {
            isAuthorized = true;
        }
    } catch { }

    // Fallback to Admin session
    if (!isAuthorized) {
        const guard = await requireSessionTenantMatch(req, tenantIdFromRoute);
        if (guard.ok && guard.sessionUser.role === 'admin') {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    try {
        const order = await domineReadRepository.getOrder((await params).tenantId, (await params).orderId);
        if (!order) {
            return errorResponse(ErrorCode.UNKNOWN, 404, requestId, 'Order not found');
        }
        return NextResponse.json({ data: order });
    } catch (e: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, e.message);
    }
}
