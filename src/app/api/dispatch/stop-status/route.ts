import { NextRequest, NextResponse } from 'next/server';
import { dispatchService } from '../../../../modules/dispatch/dispatch.service';
import { errorResponse } from '../../../../infra/http/error-response';
import { makeRequestId } from '../../../../infra/http/request-trace';
import { logger } from '../../../../infra/logger';

import { requireSessionTenantMatch } from '../../../../infra/auth/tenant-route-guard';

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);

    const headerTenant = request.headers.get('x-auth-tenant-id');
    if (!headerTenant) return errorResponse("UNAUTHORIZED" as any, 401, requestId, 'Missing tenant header');

    const guard = await requireSessionTenantMatch(request, headerTenant);
    if (!guard.ok) return guard.response;

    const tenantId = guard.tenantId;

    try {
        const body = await request.json();
        const { routeId, stopId, orderId, status, description } = body;

        if (!routeId || !stopId || !orderId || !status) {
            return errorResponse("VALIDATION_ERROR" as any, 400, requestId, 'Missing body items');
        }

        const newStatus = await dispatchService.updateStopStatus(tenantId, routeId, stopId, orderId, status, description);
        logger.info(`Updated stop status to ${newStatus}`, { tenantId, requestId, routeId, stopId });
        return NextResponse.json({ ok: true, status: newStatus });
    } catch (e: any) {
        logger.error('Failed to update stop status MVP', e as Error, { tenantId, requestId });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId);
    }
}
