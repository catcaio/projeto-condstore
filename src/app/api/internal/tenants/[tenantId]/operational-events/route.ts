export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, lte, asc } from 'drizzle-orm';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { operationalEvents } from '@/drizzle/schema';
import { isValidEventDomain } from '@/lib/events/event-domains';

export const GET = async (
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) => {
    const requestId = makeRequestId(request);

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId } = await params;
    if (!tenantId?.trim()) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'tenantId is required');
    }

    const url = new URL(request.url);
    const domain = url.searchParams.get('domain') ?? undefined;
    const eventType = url.searchParams.get('eventType') ?? undefined;
    const from = url.searchParams.get('from') ?? undefined;
    const to = url.searchParams.get('to') ?? undefined;
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 500);

    // Validate domain filter if provided
    if (domain && !isValidEventDomain(domain)) {
        return errorResponse(
            ErrorCode.VALIDATION_ERROR, 400, requestId,
            `Invalid domain: "${domain}". Valid: ACQUISITION | CONVERSION | OPERATIONS | REVENUE | RETENTION`
        );
    }

    try {
        const db = await getDb();

        const conditions = [eq(operationalEvents.tenantId, tenantId)];
        if (domain) conditions.push(eq(operationalEvents.eventDomain, domain));
        if (eventType) conditions.push(eq(operationalEvents.eventType, eventType));
        if (from) conditions.push(gte(operationalEvents.createdAt, new Date(from)));
        if (to) conditions.push(lte(operationalEvents.createdAt, new Date(to)));

        const rows = await db
            .select()
            .from(operationalEvents)
            .where(and(...conditions))
            .orderBy(asc(operationalEvents.createdAt))
            .limit(limit);

        return NextResponse.json({ ok: true, data: rows, meta: { count: rows.length, limit } });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to query operational events');
    }
};
