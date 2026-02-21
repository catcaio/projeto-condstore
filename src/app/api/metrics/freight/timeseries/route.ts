export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { metricsRepository } from '../../../../../modules/metrics/metrics.repository';
import { logger } from '../../../../../infra/logger';
import { requireActivePlan } from '../../../../../modules/billing/requireActivePlan';

export async function GET(request: NextRequest) {
    try {
        const entitlement = await requireActivePlan(request);
        if (entitlement.errorResponse) {
            return entitlement.errorResponse;
        }
        const tenantId = entitlement.tenantId!;

        const searchParams = request.nextUrl.searchParams;
        const range = searchParams.get('range') === '30d' ? '30d' : '7d';

        const data = await metricsRepository.getFreightTimeseries(tenantId, range);
        return NextResponse.json(data);

    } catch (error) {
        logger.error('Failed to fetch freight timeseries', error as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
