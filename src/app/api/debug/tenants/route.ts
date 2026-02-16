/**
 * Debug endpoint to list all tenants.
 * Only available in development mode.
 * GET /api/debug/tenants
 */

import { NextResponse } from 'next/server';
import { tenantRepository } from '../../../../infra/repositories/tenant.repository';

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
            { error: 'Not available in production' },
            { status: 403 }
        );
    }

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
