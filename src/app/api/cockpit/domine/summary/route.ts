import { NextRequest, NextResponse } from "next/server";
import { DomineSummary } from "../../../../../domine/contracts/domineSummary";
import { isDomineEnabled } from "../../../../../domine/tenant";
import { getSessionUser } from "../../../../../infra/auth/session";

export async function GET(request: NextRequest) {
    const session = await getSessionUser(request);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = session.tenantId;
    if (!tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
