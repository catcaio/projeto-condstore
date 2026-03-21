import { NextRequest, NextResponse } from "next/server";
import { DomineSummary } from "../../../../../domine/contracts/domineSummary";
import { isDomineEnabled } from "../../../../../domine/tenant";
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { getTracedRequestId, makeRequestId, withRequestTrace } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

async function handler(request: NextRequest) {
    const requestId = getTracedRequestId(request) ?? makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const { tenantId } = auth.session;

    if (!isDomineEnabled(tenantId)) {
        logger.warn('domine_not_enabled', { requestId, tenantId, route: '/api/cockpit/domine/summary' });
        return errorResponse(ErrorCode.FORBIDDEN, 404, requestId, "Domine not enabled for this tenant");
    }

    const payload: DomineSummary = {
        tenantId,
        totalOrders: 1543,
        totalRevenue: 345000.50,
        activeConnectors: 3,
        pendingShipments: 12,
        status: "OK",
        generatedAt: new Date().toISOString(),
    };

    logger.info('domine_summary_loaded', { requestId, tenantId, route: '/api/cockpit/domine/summary' });
    const response = NextResponse.json(payload);
    response.headers.set('x-request-id', requestId);
    return response;
}

export const GET = withRequestTrace(handler);
