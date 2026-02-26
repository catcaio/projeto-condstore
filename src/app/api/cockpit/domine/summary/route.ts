import { NextResponse } from "next/server";
import { DomineSummary } from "../../../../../domine/contracts/domineSummary";
import { isDomineEnabled } from "../../../../../domine/tenant";

export async function GET(request: Request) {
    // Mocking tenantId extracted from request, assume headers or auth provides this
    const tenantId = request.headers.get("x-tenant-id") || "LOJACOND";

    if (!isDomineEnabled(tenantId)) {
        return NextResponse.json({ error: "Domine not enabled for this tenant" }, { status: 404 });
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

    return NextResponse.json(payload);
}
