export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { getDb } from '@/infra/db';
import { supremePlaybooks } from '@/drizzle/schema';
import { desc } from 'drizzle-orm';

export const GET = async (request: NextRequest) => {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const db = await getDb();
        const rows = await db
            .select()
            .from(supremePlaybooks)
            .orderBy(desc(supremePlaybooks.createdAt));

        return NextResponse.json({ ok: true, data: rows, meta: { count: rows.length } });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message ?? 'Failed to list playbooks');
    }
};
