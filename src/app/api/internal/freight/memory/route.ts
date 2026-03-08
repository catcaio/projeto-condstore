import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { freightMemory } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { makeRequestId } from '@/infra/http/request-trace';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const db = await getDb();

    const memory = await db.select().from(freightMemory)
        .where(eq(freightMemory.tenantId, tenantId))
        .orderBy(desc(freightMemory.lastUpdated))
        .limit(100);

    return NextResponse.json({ ok: true, data: { memory } });
}
