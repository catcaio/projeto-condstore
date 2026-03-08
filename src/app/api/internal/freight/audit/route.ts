import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { freightSimulations, freightConfirmations } from '@/drizzle/schema';
import { eq, desc, and, like } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const db = await getDb();
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

    const simulations = await db.select().from(freightSimulations)
        .where(eq(freightSimulations.tenantId, tenantId))
        .orderBy(desc(freightSimulations.createdAt))
        .limit(limit);

    const confirmations = await db.select().from(freightConfirmations)
        .where(eq(freightConfirmations.tenantId, tenantId))
        .orderBy(desc(freightConfirmations.createdAt))
        .limit(limit);

    return NextResponse.json({ ok: true, data: { simulations, confirmations } });
}
