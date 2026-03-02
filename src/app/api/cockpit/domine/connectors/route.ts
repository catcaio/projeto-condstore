import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from "next/server";
import { DomineConnectorsPayload } from "../../../../../domine/contracts/domineConnectors";
import { isDomineEnabled } from "../../../../../domine/tenant";
import { globalConnectorRegistry } from "../../../../../domine/connectors/ConnectorRegistry";
import { requireAdmin } from '@/infra/auth/guards';

async function _GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;
    const { tenantId } = auth.session;

    if (!isDomineEnabled(tenantId)) {
        return NextResponse.json({ error: "Domine not enabled for this tenant" }, { status: 404 });
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

    return NextResponse.json(payload);
}

export const GET = withGlobalErrorInterceptor(_GET);
