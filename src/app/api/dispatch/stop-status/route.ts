import { NextRequest, NextResponse } from 'next/server';
import { dispatchService } from '../../../../modules/dispatch/dispatch.service';
import { errorResponse } from '../../../../infra/http/error-response';
import { makeRequestId } from '../../../../infra/http/request-trace';
import { logger } from '../../../../infra/logger';

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);

    // In MVP, PWA will send authorization tokens which our middleware converts 
    // to x-auth headers or we validate JWT manually. Assuming middleware works:
    const tenantId = request.headers.get('x-auth-tenant-id');
    const role = request.headers.get('x-auth-role');

    if (!tenantId || !role) {
        return errorResponse("UNAUTHORIZED" as any, 401, requestId, 'Missing context');
    }

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
