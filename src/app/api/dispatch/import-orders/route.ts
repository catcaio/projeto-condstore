import { NextRequest, NextResponse } from 'next/server';
import { dispatchService } from '../../../../modules/dispatch/dispatch.service';
import { errorResponse } from '../../../../infra/http/error-response';
import { makeRequestId } from '../../../../infra/http/request-trace';
import { logger } from '../../../../infra/logger';

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);

    // Simplest RBAC based on headers
    const tenantId = request.headers.get('x-auth-tenant-id');
    const role = request.headers.get('x-auth-role');

    if (!tenantId || !role) {
        return errorResponse("UNAUTHORIZED" as any, 401, requestId, 'Missing context');
    }

    try {
        const count = await dispatchService.importOrders(tenantId);
        logger.info(`Imported ${count} pending local orders for dispatch`, { tenantId, requestId });
        return NextResponse.json({ ok: true, imported: count });
    } catch (e: any) {
        logger.error('Failed to import dispatch orders', e as Error, { tenantId, requestId });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId);
    }
}
