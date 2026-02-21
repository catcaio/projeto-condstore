export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { metricsRepository } from '../../../../../modules/metrics/metrics.repository';
import { logger } from '../../../../../infra/logger';
import { getSessionUser } from '../../../../../infra/auth/session';

export async function GET(request: NextRequest) {
    try {
        const session = await getSessionUser(request);
        if (!session?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.tenantId;

        const searchParams = request.nextUrl.searchParams;
        const range = searchParams.get('range') === '30d' ? '30d' : '7d';

        const data = await metricsRepository.getFreightTimeseries(tenantId, range);
        return NextResponse.json(data);

    } catch (error) {
        logger.error('Failed to fetch freight timeseries', error as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
