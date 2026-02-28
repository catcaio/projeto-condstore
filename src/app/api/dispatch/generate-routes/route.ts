import { NextRequest, NextResponse } from 'next/server';
import { dispatchService } from '../../../../modules/dispatch/dispatch.service';
import { errorResponse } from '../../../../infra/http/error-response';
import { makeRequestId } from '../../../../infra/http/request-trace';
import { logger } from '../../../../infra/logger';

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);

    const url = new URL(request.url);
    const date = url.searchParams.get('date'); // default target date for MVP

    const tenantId = request.headers.get('x-auth-tenant-id');
    const role = request.headers.get('x-auth-role');

    if (!tenantId || !role) {
        return errorResponse("UNAUTHORIZED" as any, 401, requestId, 'Missing context');
    }

    if (!date) {
        return errorResponse("VALIDATION_ERROR" as any, 400, requestId, 'Missing date query param (YYYY-MM-DD)');
    }

    try {
        const routes = await dispatchService.generateRoutes(tenantId, date);
        logger.info(`Generated ${routes.length} routes for dispatch MVP`, { tenantId, requestId });
        return NextResponse.json({ ok: true, routesGenerated: routes });
    } catch (e: any) {
        logger.error('Failed to generate dispatch routes', e as Error, { tenantId, requestId });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId);
    }
}
