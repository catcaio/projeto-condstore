export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { metricsRepository } from '../../../../modules/metrics/metrics.repository';
import { logger } from '../../../../infra/logger';
import { getSessionUser } from '../../../../infra/auth/session';

export async function GET(request: NextRequest) {
    try {
        const session = await getSessionUser(request);
        if (!session?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.tenantId;

        const metrics = await metricsRepository.getFreightMetrics(tenantId);
        return NextResponse.json(metrics);

    } catch (error) {
        logger.error('Failed to fetch freight metrics', error as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
