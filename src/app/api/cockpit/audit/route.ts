import { NextRequest, NextResponse } from 'next/server';
import { requireActivePlan } from '../../../../modules/billing/requireActivePlan';
import { requireAdmin } from '../../../../infra/auth/guards';
import { getDb } from '@/infra/db';
import { tenantEvents } from '../../../../drizzle/schema';
import { eq, desc, asc, and, gte, lte, like, sql } from 'drizzle-orm';
import { logger } from '@/infra/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return auth.response;
    }

    // 1) Auth / tenant resolution + Plan Entitlement
    const entitlement = (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development')
        ? { errorResponse: null, tenantId: auth.session.tenantId }
        : await requireActivePlan(request);
    if (entitlement.errorResponse) {
        return entitlement.errorResponse;
    }
    const tenantId = entitlement.tenantId!;

    // 2) Parse Search Params
    const searchParams = request.nextUrl.searchParams;
    let page = parseInt(searchParams.get('page') || '1', 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(searchParams.get('limit') || '20', 10);
    if (isNaN(limit) || limit < 1 || limit > 100) limit = 20;

    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const q = searchParams.get('q');
    const typeFilters = searchParams.get('type');
    const statusFilter = searchParams.get('status');
    const actorFilter = searchParams.get('actor');
    const resourceFilter = searchParams.get('resource');
    const startDate = searchParams.get('dateStart');
    const endDate = searchParams.get('dateEnd');

    try {
        if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development') {
            // Mock DEV data
            let mockEvents = [
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
                },
                {
                    id: 'evt_4',
                    tenantId: 'condstore',
                    type: 'USER_LOGIN',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    payload: { status: 'success', resource: 'Autenticação' }
                },
                {
                    id: 'evt_5',
                    tenantId: 'condstore',
                    type: 'ITEM_UPDATED',
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    payload: { status: 'success', resource: 'Produto ABC' }
                },
                {
                    id: 'evt_6',
                    tenantId: 'condstore',
                    type: 'USER_LOGOUT',
                    createdAt: new Date(Date.now() - 200000000).toISOString(),
                    payload: { status: 'success', resource: 'Autenticação' }
                },
                {
                    id: 'evt_7',
                    tenantId: 'condstore',
                    type: 'ITEM_CREATED',
                    createdAt: new Date(Date.now() - 300000000).toISOString(),
                    payload: { status: 'success', resource: 'Produto ZZZ' }
                },
                {
                    id: 'evt_8',
                    tenantId: tenantId,
                    type: 'BILLING_FAILED',
                    createdAt: new Date(Date.now() - 400000000).toISOString(),
                    payload: { status: 'failure', resource: 'Fatura #112' }
                },
                {
                    id: 'evt_9',
                    tenantId: tenantId,
                    type: 'USER_LOGIN',
                    createdAt: new Date(Date.now() - 500000000).toISOString(),
                    payload: { status: 'failure', resource: 'Autenticação' }
                },
                {
                    id: 'evt_10',
                    tenantId: 'condstore',
                    type: 'ITEM_UPDATED',
                    createdAt: new Date(Date.now() - 600000000).toISOString(),
                    payload: { status: 'success', resource: 'Produto YY' }
                },
                {
                    id: 'evt_11',
                    tenantId: tenantId,
                    type: 'USER_LOGIN',
                    createdAt: new Date(Date.now() - 700000000).toISOString(),
                    payload: { status: 'success', resource: 'Autenticação' }
                },
            ];

            // Filter mocks
            if (q) {
                const searchLower = q.toLowerCase();
                mockEvents = mockEvents.filter(e =>
                    e.type.toLowerCase().includes(searchLower) ||
                    e.payload.resource?.toLowerCase().includes(searchLower) ||
                    e.tenantId.toLowerCase().includes(searchLower) ||
                    e.payload.status?.toLowerCase().includes(searchLower)
                );
            }
            if (typeFilters) {
                mockEvents = mockEvents.filter(e => e.type === typeFilters);
            }
            if (statusFilter) {
                mockEvents = mockEvents.filter(e => e.payload.status === statusFilter);
            }
            if (actorFilter) {
                mockEvents = mockEvents.filter(e => e.tenantId.toLowerCase().includes(actorFilter.toLowerCase()));
            }
            if (resourceFilter) {
                mockEvents = mockEvents.filter(e => e.payload.resource?.toLowerCase().includes(resourceFilter.toLowerCase()));
            }
            if (startDate) {
                mockEvents = mockEvents.filter(e => new Date(e.createdAt).getTime() >= new Date(startDate).getTime());
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                mockEvents = mockEvents.filter(e => new Date(e.createdAt).getTime() <= end.getTime());
            }

            // Sort mocks
            mockEvents.sort((a: any, b: any) => {
                let valA = a[sort === 'timestamp' ? 'createdAt' : sort] || a.payload[sort];
                let valB = b[sort === 'timestamp' ? 'createdAt' : sort] || b.payload[sort];

                if (sort === 'timestamp' || sort === 'createdAt') {
                    valA = new Date(valA).getTime();
                    valB = new Date(valB).getTime();
                }

                if (valA < valB) return order === 'asc' ? -1 : 1;
                if (valA > valB) return order === 'asc' ? 1 : -1;
                return 0;
            });

            const total = mockEvents.length;
            const startIdx = (page - 1) * limit;
            const paginatedEvents = mockEvents.slice(startIdx, startIdx + limit);

            return NextResponse.json({
                success: true,
                events: paginatedEvents,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });
        }

        const db = await getDb();
        const conditions = [eq(tenantEvents.tenantId, tenantId)];

        if (q) {
            conditions.push(sql`${tenantEvents.type} ILIKE ${`%${q}%`} OR ${tenantEvents.payload}::text ILIKE ${`%${q}%`}`);
        }
        if (typeFilters) {
            conditions.push(eq(tenantEvents.type, typeFilters));
        }
        if (startDate) {
            conditions.push(gte(tenantEvents.createdAt, new Date(startDate)));
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            conditions.push(lte(tenantEvents.createdAt, end));
        }
        // PostgreSQL JSONB filtering for status/resource/actor could be done here if structure is rigid
        if (statusFilter) {
            conditions.push(sql`${tenantEvents.payload}->>'status' = ${statusFilter}`);
        }
        if (resourceFilter) {
            conditions.push(sql`${tenantEvents.payload}->>'resource' ILIKE ${`%${resourceFilter}%`}`);
        }

        const offset = (page - 1) * limit;

        let orderClause = desc(tenantEvents.createdAt);
        if (sort === 'createdAt' || sort === 'timestamp') orderClause = order === 'asc' ? asc(tenantEvents.createdAt) : desc(tenantEvents.createdAt);
        if (sort === 'type' || sort === 'action') orderClause = order === 'asc' ? asc(tenantEvents.type) : desc(tenantEvents.type);

        const [countResult, events] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(tenantEvents).where(and(...conditions)),
            db.select().from(tenantEvents).where(and(...conditions)).orderBy(orderClause).limit(limit).offset(offset)
        ]);

        const total = Number(countResult[0]?.count || 0);

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
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
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
