import { NextRequest, NextResponse } from "next/server";
import { DomineConnectorsPayload } from "../../../../../domine/contracts/domineConnectors";
import { isDomineEnabled } from "../../../../../domine/tenant";
import { globalConnectorRegistry } from "../../../../../domine/connectors/ConnectorRegistry";
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
        logger.warn('domine_not_enabled', { requestId, tenantId, route: '/api/cockpit/domine/connectors' });
        return errorResponse(ErrorCode.FORBIDDEN, 404, requestId, "Domine not enabled for this tenant");
    }

    const registeredConnectors = globalConnectorRegistry.list();

    const payload: DomineConnectorsPayload = {
        tenantId,
        connectors: registeredConnectors.map((c) => ({
            id: c.id,
            name: c.name,
            capabilities: c.capabilities,
            status: "HEALTHY",
            lastSyncAt: new Date().toISOString()
        }))
    };

    logger.info('domine_connectors_listed', { requestId, tenantId, route: '/api/cockpit/domine/connectors', connectorCount: payload.connectors.length });

    const response = NextResponse.json(payload);
    response.headers.set('x-request-id', requestId);
    return response;
}

export const GET = withRequestTrace(handler);
