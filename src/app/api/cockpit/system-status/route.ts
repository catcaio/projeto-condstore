import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, ErrorCode } from '../../../../infra/http/error-response';
import { makeRequestId } from '../../../../infra/http/request-trace';
import { getSystemStatus } from '../../../../app/(app)/cockpit/system-status/queries';
import { logger } from '../../../../infra/logger';
import { requireAdmin } from '@/infra/auth/guards';

export const revalidate = 60; // Route Segment config: cache for 60s

async function _GET(request: NextRequest) {
    const requestId = makeRequestId(request);

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const { tenantId, role } = auth.session;

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

export const GET = withGlobalErrorInterceptor(_GET);
