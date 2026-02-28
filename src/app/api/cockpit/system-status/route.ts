import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, ErrorCode } from '../../../../infra/http/error-response';
import { makeRequestId } from '../../../../infra/http/request-trace';
import { getSystemStatus } from '../../../../app/(app)/cockpit/system-status/queries';
import { logger } from '../../../../infra/logger';

export const revalidate = 60; // Route Segment config: cache for 60s

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);

    // Simplest RBAC based on existing headers from middleware
    const tenantId = request.headers.get('x-auth-tenant-id');
    const role = request.headers.get('x-auth-role');

    if (!tenantId || !role) {
        return errorResponse("UNAUTHORIZED" as any, 401, requestId, 'Missing context');
    }

    try {
        const payload = await getSystemStatus(tenantId, role);
        return NextResponse.json({ ok: true, data: payload }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
            }
        });
    } catch (e: any) {
        logger.error('Failed to get system status', e as Error, { tenantId, requestId });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId);
    }
}
