import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { packingProfiles } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';

export const dynamic = 'force-dynamic';

const VALID_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['REVIEWED'],
    REVIEWED: ['ACTIVE', 'DRAFT'],
    ACTIVE: ['REVIEWED'],
};

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
        const body = await request.json();
        const { reviewStatus } = body;

        if (!reviewStatus || typeof reviewStatus !== 'string') {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'reviewStatus is required');
        }

        const [existing] = await db
            .select()
            .from(packingProfiles)
            .where(and(eq(packingProfiles.id, id), eq(packingProfiles.tenantId, tenantId)));

        if (!existing) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Packing profile not found');
        }

        const allowedTransitions = VALID_TRANSITIONS[existing.reviewStatus] || [];
        if (!allowedTransitions.includes(reviewStatus)) {
            return errorResponse(
                ErrorCode.VALIDATION_ERROR,
                400,
                requestId,
                `Cannot transition from ${existing.reviewStatus} to ${reviewStatus}. Allowed: ${allowedTransitions.join(', ')}`,
            );
        }

        const updates: Record<string, any> = { reviewStatus };

        // Auto-activate when moving to ACTIVE
        if (reviewStatus === 'ACTIVE') {
            updates.isActive = true;
        }

        await db
            .update(packingProfiles)
            .set(updates)
            .where(and(eq(packingProfiles.id, id), eq(packingProfiles.tenantId, tenantId)));

        return NextResponse.json({ ok: true, data: { id, reviewStatus, isActive: updates.isActive ?? existing.isActive } });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to update review status');
    }
}
