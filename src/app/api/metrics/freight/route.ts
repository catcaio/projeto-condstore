export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { metricsRepository } from '../../../../modules/metrics/metrics.repository';
import { logger } from '@/infra/logger';
import { requireActivePlan } from '@/modules/billing';

export async function GET(request: NextRequest) {
    try {
        const entitlement = await requireActivePlan(request);
        if (entitlement.errorResponse) {
            return entitlement.errorResponse;
        }
        const tenantId = entitlement.tenantId!;

        const metrics = await metricsRepository.getFreightMetrics(tenantId);
        return NextResponse.json(metrics);

    } catch (error) {
        logger.error('Failed to fetch freight metrics', error as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
