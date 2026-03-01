import { NextRequest, NextResponse } from 'next/server';
import { sql, and, eq } from 'drizzle-orm';
import { getDb } from '../../../../infra/db';
import { requireAdmin } from '../../../../infra/auth/guards';
import { makeRequestId } from '../../../../infra/http/request-trace';
import { tenantSavedViews } from '../../../../drizzle/schema';
import { randomUUID } from 'crypto';

// Import schemas for validation
import { AUDIT_FILTER_KEYS } from '../../../../ui/components/filters/schemas/audit';
import { ACQUISITION_FILTER_KEYS } from '../../../../ui/components/filters/schemas/acquisition';

export const runtime = 'nodejs';

import { isDevRuntime, isQaAutomation } from '../../../../infra/env/devOnly';

const ALLOWED_BY_MODULE: Record<string, string[]> = {
    'audit': AUDIT_FILTER_KEYS,
    'acquisition': ACQUISITION_FILTER_KEYS,
    'acquisition_drilldown': ACQUISITION_FILTER_KEYS
};

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const searchParams = request.nextUrl.searchParams;
    const moduleName = searchParams.get('module');

    if (!moduleName) {
        return NextResponse.json({ success: false, error: 'Module required' }, { status: 400 });
    }

    try {
        const db = await getDb();
        const views = await db.select()
            .from(tenantSavedViews)
            .where(and(eq(tenantSavedViews.tenantId, tenantId), eq(tenantSavedViews.module, moduleName)))
            .orderBy(tenantSavedViews.createdAt)
            .limit(25);

        return NextResponse.json({
            success: true,
            views: views.map((v: any) => ({
                id: v.id,
                name: v.name,
                filters: JSON.parse(v.filtersJson),
                updatedAt: v.updatedAt,
                source: 'server'
            }))
        });
    } catch (e) {
        if (isDevRuntime() || isQaAutomation()) {
            return NextResponse.json({
                success: true,
                // @ts-ignore
                views: global.__DEV_MOCK_VIEWS || []
            });
        }
        return NextResponse.json({ success: false, error: 'DB Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const body = await request.json().catch(() => ({}));
    const { module: moduleName, name, filters } = body;

    if (!moduleName || !name || typeof filters !== 'object') {
        return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const allowedKeys = ALLOWED_BY_MODULE[moduleName];
    if (!allowedKeys) {
        return NextResponse.json({ success: false, error: 'Unknown module schema' }, { status: 400 });
    }

    // Sanitize filters
    const cleanFilters: Record<string, any> = {};
    for (const key of allowedKeys) {
        if (filters[key] !== undefined) {
            cleanFilters[key] = filters[key];
        }
    }

    try {
        const db = await getDb();

        // Count limit
        const existingCount = await db.select({ count: sql<number>`count(*)` })
            .from(tenantSavedViews)
            .where(and(eq(tenantSavedViews.tenantId, tenantId), eq(tenantSavedViews.module, moduleName)));

        if (Number(existingCount[0]?.count || 0) >= 25) {
            return NextResponse.json({ success: false, error: 'Limit reached (25 views max)' }, { status: 400 });
        }

        const id = randomUUID();
        await db.insert(tenantSavedViews).values({
            id,
            tenantId,
            module: moduleName,
            name,
            filtersJson: JSON.stringify(cleanFilters),
            createdByUserId: (auth.session as any).userId || null,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return NextResponse.json({
            success: true,
            view: {
                id,
                name,
                filters: cleanFilters,
                updatedAt: new Date().toISOString(),
                source: 'server'
            }
        });
    } catch (e) {
        if (isDevRuntime() || isQaAutomation()) {
            const mockView = {
                id: randomUUID(),
                name,
                filters: cleanFilters,
                updatedAt: new Date().toISOString(),
                source: 'server'
            };
            // @ts-ignore
            global.__DEV_MOCK_VIEWS = [mockView, ...(global.__DEV_MOCK_VIEWS || [])];
            return NextResponse.json({ success: true, view: mockView });
        }
        return NextResponse.json({ success: false, error: 'DB Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    try {
        const db = await getDb();
        await db.delete(tenantSavedViews).where(and(eq(tenantSavedViews.id, id), eq(tenantSavedViews.tenantId, tenantId)));
        return NextResponse.json({ success: true });
    } catch (e) {
        if (isDevRuntime() || isQaAutomation()) return NextResponse.json({ success: false, fallback: true });
        return NextResponse.json({ success: false, error: 'DB Error' }, { status: 500 });
    }
}
