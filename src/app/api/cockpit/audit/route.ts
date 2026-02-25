import { NextRequest, NextResponse } from 'next/server';
import { requireActivePlan } from '../../../../modules/billing/requireActivePlan';
import { requireAdmin } from '../../../../infra/auth/guards';
import { getDb } from '@/infra/db';
import { tenantEvents } from '../../../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/infra/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    // 1) Auth / tenant resolution + Plan Entitlement
    const entitlement = await requireActivePlan(request);
    if (entitlement.errorResponse) {
        return entitlement.errorResponse;
    }
    const tenantId = entitlement.tenantId!;

    // 2) Parse limit
    const searchParams = request.nextUrl.searchParams;
    let limit = parseInt(searchParams.get('limit') || '50', 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
        limit = 50;
    }

    try {
        const db = await getDb();
        const events = await db
            .select()
            .from(tenantEvents)
            .where(eq(tenantEvents.tenantId, tenantId))
            .orderBy(desc(tenantEvents.createdAt))
            .limit(limit);

        // Parse JSON payload securely before returning
        const serializedEvents = events.map(event => ({
            id: event.id,
            tenantId: event.tenantId,
            type: event.type,
            payload: event.payload ? JSON.parse(event.payload) : {},
            createdAt: event.createdAt
        }));

        return NextResponse.json({
            success: true,
            events: serializedEvents,
            meta: {
                count: serializedEvents.length,
                limit
            }
        });
    } catch (error: any) {
        logger.error('Failed to fetch tenant audit events', error, { tenantId });
        return NextResponse.json({
            success: false,
            error: 'Database error fetching audit logs',
            message: error?.message
        }, { status: 500 });
    }
}
