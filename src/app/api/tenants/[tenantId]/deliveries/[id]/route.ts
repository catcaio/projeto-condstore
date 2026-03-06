import { NextRequest, NextResponse } from 'next/server';
import {
    extractTenantIdFromTenantRoute,
    requireSessionTenantMatch,
} from '../../../../../../infra/auth/tenant-route-guard';
import { deliveriesRepository } from '../../../../../../infra/repositories/deliveries.repository';
import { structuredLogger } from '../../../../../../infra/log/logger';

export const runtime = 'nodejs';

export async function GET(
    request: NextRequest,
    context: any // Fix for Next.js 15+ App Router params
): Promise<NextResponse> {
    try {
        const tenantId = extractTenantIdFromTenantRoute(request);
        const guard = await requireSessionTenantMatch(request, tenantId);
        if (!guard.ok) return guard.response;

        const { id } = await context.params;

        if (!id) {
            return NextResponse.json({ error: 'Missing delivery ID' }, { status: 400 });
        }

        const delivery = await deliveriesRepository.findDeliveryById(guard.tenantId, id);

        if (!delivery) {
            return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
        }

        return NextResponse.json(delivery);
    } catch (error: any) {
        structuredLogger.error('api_delivery_detail_error', {
            error: error.message,
            route: '/api/tenants/[tenantId]/deliveries/[id]'
        });
        return NextResponse.json({ error: 'Failed to GET delivery' }, { status: 500 });
    }
}
