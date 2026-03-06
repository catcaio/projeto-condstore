export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { getDb } from '@/infra/db';
import { supremePlaybooks } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export const POST = async (
    request: NextRequest,
    { params }: { params: Promise<{ playbookId: string }> }
) => {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { playbookId } = await params;
    if (!playbookId?.trim()) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'playbookId required');

    try {
        const db = await getDb();
        const [pb] = await db.select().from(supremePlaybooks).where(eq(supremePlaybooks.id, playbookId)).limit(1);
        if (!pb) return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Playbook not found');

        const newStatus = !pb.isActive;
        await db.update(supremePlaybooks).set({ isActive: newStatus }).where(eq(supremePlaybooks.id, playbookId));

        return NextResponse.json({ ok: true, data: { id: playbookId, isActive: newStatus } }, { status: 200 });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message ?? 'Failed to toggle playbook');
    }
};
