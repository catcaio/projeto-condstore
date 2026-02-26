import { NextResponse } from "next/server";
import { DomineConnectorsPayload } from "../../../../../domine/contracts/domineConnectors";
import { isDomineEnabled } from "../../../../../domine/tenant";
import { globalConnectorRegistry } from "../../../../../domine/connectors/ConnectorRegistry";

export async function GET(request: Request) {
    const tenantId = request.headers.get("x-tenant-id") || "LOJACOND";

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
