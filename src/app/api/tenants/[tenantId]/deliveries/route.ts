import { NextRequest, NextResponse } from 'next/server';
import {
    extractTenantIdFromTenantRoute,
    requireSessionTenantMatch,
} from '../../../../../infra/auth/tenant-route-guard';
import { deliveriesRepository } from '../../../../../infra/repositories/deliveries.repository';
import { structuredLogger } from '../../../../../infra/log/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: any): Promise<NextResponse> {
    try {
        const tenantId = extractTenantIdFromTenantRoute(request);
        const guard = await requireSessionTenantMatch(request, tenantId);
        if (!guard.ok) return guard.response;

        const deliveries = await deliveriesRepository.listActiveDeliveries(guard.tenantId);

        return NextResponse.json(deliveries);
    } catch (error: any) {
        structuredLogger.error('api_deliveries_list_error', {
            error: error.message,
            route: '/api/tenants/[tenantId]/deliveries'
        });
        return NextResponse.json({ error: 'Failed to GET deliveries' }, { status: 500 });
    }
}
