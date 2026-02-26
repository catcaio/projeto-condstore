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
    const entitlement = (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development') ? { errorResponse: null, tenantId: auth.session.tenantId } : await requireActivePlan(request);
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
        if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development') {
            return NextResponse.json({
                success: true,
                events: [
                    {
                        id: 'evt_1',
                        tenantId: tenantId,
                        type: 'USER_LOGIN',
                        payload: { status: 'success', resource: 'Autenticação' },
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'evt_2',
                        tenantId: tenantId,
                        type: 'ITEM_UPDATED',
                        payload: { status: 'success', resource: 'Produto XPTO' },
                        createdAt: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        id: 'evt_3',
                        tenantId: tenantId,
                        type: 'BILLING_FAILED',
                        payload: { status: 'failure', resource: 'Fatura #111' },
                        createdAt: new Date(Date.now() - 7200000).toISOString()
                    }
                ],
                meta: { count: 3, limit }
            });
        }

        const db = await getDb();
        const events = await db
            .select()
            .from(tenantEvents)
            .where(eq(tenantEvents.tenantId, tenantId))
            .orderBy(desc(tenantEvents.createdAt))
            .limit(limit);

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
