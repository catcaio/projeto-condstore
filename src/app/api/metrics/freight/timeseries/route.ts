import { NextRequest, NextResponse } from 'next/server';
import { metricsRepository } from '../../../../../modules/metrics/metrics.repository';
import { logger } from '../../../../../infra/logger';
import { getTenantContext } from '../../../../../infra/auth/tenant-context';
import { BusinessError, ErrorCode } from '../../../../../infra/errors';

export async function GET(request: NextRequest) {
    try {
        // Auth & Tenant Resolution — enforced via getTenantContext (401 if unauthenticated)
        const ctx = await getTenantContext(request);
        const tenantId = ctx.tenantId;

        const range = request.nextUrl.searchParams.get('range') === '30d' ? '30d' : '7d';

        const data = await metricsRepository.getFreightTimeseries(tenantId, range);
        return NextResponse.json(data);
    } catch (error) {
        if (
            error instanceof BusinessError &&
            error.code === ErrorCode.UNAUTHORIZED
        ) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        logger.error('Failed to fetch freight timeseries', error as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
