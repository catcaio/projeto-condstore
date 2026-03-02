import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
/**
 * Debug endpoint to list all tenants.
 * Only available in development mode.
 * GET /api/debug/tenants
 */

import { NextResponse } from 'next/server';
import { tenantRepository } from '../../../../infra/repositories/tenant.repository';
import { assertDevOnly } from '@/infra/env/devOnly';

async function _GET() {
    const devGuard = assertDevOnly();
    if (devGuard) return devGuard;

    try {
        const allTenants = await tenantRepository.getAllTenants();

        return NextResponse.json({
            count: allTenants.length,
            tenants: allTenants.map(t => ({
                id: t.id,
                name: t.name,
                twilioNumber: t.twilioNumber,
                createdAt: t.createdAt,
            })),
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to fetch tenants',
                message: (error as Error).message,
            },
            { status: 500 }
        );
    }
}

export const GET = withGlobalErrorInterceptor(_GET);
