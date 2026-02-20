
import { NextRequest, NextResponse } from 'next/server';
import { metricsRepository } from '../../../../../modules/metrics/metrics.repository';
import { logger } from '../../../../../infra/logger';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        let tenantId = request.headers.get('x-tenant-id');
        const range = searchParams.get('range') === '30d' ? '30d' : '7d';

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
        }

        const data = await metricsRepository.getFreightTimeseries(tenantId, range);
        return NextResponse.json(data);

    } catch (error) {
        logger.error('Failed to fetch freight timeseries', error as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
