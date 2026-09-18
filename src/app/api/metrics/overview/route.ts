import { NextRequest, NextResponse } from 'next/server';
import { getMetricsOverview } from '@/modules/metrics/queries/overview-queries';
import { logger } from '@/infra/logger';
import { requireActivePlan } from '@/modules/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1) Auth / tenant resolution + Plan Entitlement
        const entitlement = await requireActivePlan(request);
        if (entitlement.errorResponse) {
            return entitlement.errorResponse;
        }
        const tenantId = entitlement.tenantId!;

        // Query oficial (metrics = autoridade semântica); rota é apresentação.
        return NextResponse.json(await getMetricsOverview(tenantId), { status: 200 });

    } catch (err) {
        logger.error('Metrics overview failed', err as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
