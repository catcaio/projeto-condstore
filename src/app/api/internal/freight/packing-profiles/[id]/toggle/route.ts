import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { packingProfiles } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';

export const dynamic = 'force-dynamic';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const db = await getDb();
        const tenantId = auth.session.tenantId;
        const { id } = await context.params;

        const [existing] = await db
            .select()
            .from(packingProfiles)
            .where(and(eq(packingProfiles.id, id), eq(packingProfiles.tenantId, tenantId)));

        if (!existing) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Packing profile not found');
        }

        const newActiveState = !existing.isActive;

        await db
            .update(packingProfiles)
            .set({ isActive: newActiveState })
            .where(and(eq(packingProfiles.id, id), eq(packingProfiles.tenantId, tenantId)));

        return NextResponse.json({ ok: true, data: { id, isActive: newActiveState } });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to toggle packing profile');
    }
}
