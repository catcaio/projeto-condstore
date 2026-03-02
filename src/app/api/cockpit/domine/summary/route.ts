import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from "next/server";
import { DomineSummary } from "../../../../../domine/contracts/domineSummary";
import { isDomineEnabled } from "../../../../../domine/tenant";
import { requireAdmin } from '@/infra/auth/guards';

async function _GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;
    const { tenantId } = auth.session;

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

export const GET = withGlobalErrorInterceptor(_GET);
