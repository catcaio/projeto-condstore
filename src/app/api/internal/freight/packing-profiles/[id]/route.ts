import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { packingProfiles } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';

export const dynamic = 'force-dynamic';

const VALID_PACKING_MODES = ['SINGLE_FIXED', 'STACK_VERTICAL', 'STACK_HORIZONTAL', 'NESTED', 'CUSTOM_RULE'] as const;

export async function PUT(
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

        const [existing] = await db
            .select()
            .from(packingProfiles)
            .where(and(eq(packingProfiles.id, id), eq(packingProfiles.tenantId, tenantId)));

        if (!existing) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Packing profile not found');
        }

        const { profileName, productRef, baseHeight, baseWidth, baseLength, baseWeight,
            packingMode, stackable, nestable, requiresOwnBox,
            heightIncrementPerExtraUnit, widthIncrementPerExtraUnit, lengthIncrementPerExtraUnit,
            maxUnitsPerVolume } = body;

        if (packingMode && !VALID_PACKING_MODES.includes(packingMode)) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `Invalid packingMode. Use: ${VALID_PACKING_MODES.join(', ')}`);
        }

        const updates: Record<string, any> = {};
        if (profileName !== undefined) updates.profileName = String(profileName).trim();
        if (productRef !== undefined) updates.productRef = productRef?.trim() || null;
        if (baseHeight !== undefined) updates.baseHeight = String(Number(baseHeight) || 0);
        if (baseWidth !== undefined) updates.baseWidth = String(Number(baseWidth) || 0);
        if (baseLength !== undefined) updates.baseLength = String(Number(baseLength) || 0);
        if (baseWeight !== undefined) updates.baseWeight = String(Number(baseWeight) || 0);
        if (packingMode !== undefined) updates.packingMode = packingMode;
        if (stackable !== undefined) updates.stackable = Boolean(stackable);
        if (nestable !== undefined) updates.nestable = Boolean(nestable);
        if (requiresOwnBox !== undefined) updates.requiresOwnBox = Boolean(requiresOwnBox);
        if (heightIncrementPerExtraUnit !== undefined) updates.heightIncrementPerExtraUnit = String(Number(heightIncrementPerExtraUnit) || 0);
        if (widthIncrementPerExtraUnit !== undefined) updates.widthIncrementPerExtraUnit = String(Number(widthIncrementPerExtraUnit) || 0);
        if (lengthIncrementPerExtraUnit !== undefined) updates.lengthIncrementPerExtraUnit = String(Number(lengthIncrementPerExtraUnit) || 0);
        if (maxUnitsPerVolume !== undefined) updates.maxUnitsPerVolume = Number(maxUnitsPerVolume) || 1;

        if (Object.keys(updates).length === 0) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'No fields to update');
        }

        await db
            .update(packingProfiles)
            .set(updates)
            .where(and(eq(packingProfiles.id, id), eq(packingProfiles.tenantId, tenantId)));

        const [updated] = await db
            .select()
            .from(packingProfiles)
            .where(eq(packingProfiles.id, id));

        return NextResponse.json({ ok: true, data: updated });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to update packing profile');
    }
}
