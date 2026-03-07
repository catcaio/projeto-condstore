import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { packingProfiles } from '@/drizzle/schema';
import { eq, and, like, desc, sql } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const VALID_PACKING_MODES = ['SINGLE_FIXED', 'STACK_VERTICAL', 'STACK_HORIZONTAL', 'NESTED', 'CUSTOM_RULE'] as const;
const VALID_REVIEW_STATUSES = ['DRAFT', 'REVIEWED', 'ACTIVE'] as const;
const VALID_SOURCES = ['MANUAL', 'SITE_SCRAPE'] as const;

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const db = await getDb();
        const tenantId = auth.session.tenantId;
        const params = request.nextUrl.searchParams;

        const reviewStatus = params.get('review_status');
        const source = params.get('source');
        const isActive = params.get('is_active');
        const q = params.get('q');

        const conditions = [eq(packingProfiles.tenantId, tenantId)];

        if (reviewStatus && VALID_REVIEW_STATUSES.includes(reviewStatus as any)) {
            conditions.push(eq(packingProfiles.reviewStatus, reviewStatus));
        }
        if (source && VALID_SOURCES.includes(source as any)) {
            conditions.push(eq(packingProfiles.source, source));
        }
        if (isActive === 'true') {
            conditions.push(eq(packingProfiles.isActive, true));
        } else if (isActive === 'false') {
            conditions.push(eq(packingProfiles.isActive, false));
        }
        if (q) {
            conditions.push(like(packingProfiles.profileName, `%${q}%`));
        }

        const rows = await db
            .select()
            .from(packingProfiles)
            .where(and(...conditions))
            .orderBy(desc(packingProfiles.updatedAt))
            .limit(200);

        return NextResponse.json({ ok: true, data: rows, total: rows.length });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to list packing profiles');
    }
}

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const db = await getDb();
        const tenantId = auth.session.tenantId;
        const body = await request.json();

        const { profileName, productRef, baseHeight, baseWidth, baseLength, baseWeight,
            packingMode, stackable, nestable, requiresOwnBox,
            heightIncrementPerExtraUnit, widthIncrementPerExtraUnit, lengthIncrementPerExtraUnit,
            maxUnitsPerVolume, source } = body;

        if (!profileName || typeof profileName !== 'string' || profileName.trim().length === 0) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'profileName is required');
        }

        if (packingMode && !VALID_PACKING_MODES.includes(packingMode)) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `Invalid packingMode. Use: ${VALID_PACKING_MODES.join(', ')}`);
        }

        if (source && !VALID_SOURCES.includes(source)) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `Invalid source. Use: ${VALID_SOURCES.join(', ')}`);
        }

        const id = randomUUID();

        await db.insert(packingProfiles).values({
            id,
            tenantId,
            profileName: profileName.trim(),
            productRef: productRef?.trim() || null,
            baseHeight: String(Number(baseHeight) || 0),
            baseWidth: String(Number(baseWidth) || 0),
            baseLength: String(Number(baseLength) || 0),
            baseWeight: String(Number(baseWeight) || 0),
            packingMode: packingMode || 'SINGLE_FIXED',
            stackable: Boolean(stackable),
            nestable: Boolean(nestable),
            requiresOwnBox: Boolean(requiresOwnBox),
            heightIncrementPerExtraUnit: String(Number(heightIncrementPerExtraUnit) || 0),
            widthIncrementPerExtraUnit: String(Number(widthIncrementPerExtraUnit) || 0),
            lengthIncrementPerExtraUnit: String(Number(lengthIncrementPerExtraUnit) || 0),
            maxUnitsPerVolume: Number(maxUnitsPerVolume) || 1,
            reviewStatus: 'DRAFT',
            isActive: false,
            source: source || 'MANUAL',
        });

        const [created] = await db
            .select()
            .from(packingProfiles)
            .where(eq(packingProfiles.id, id));

        return NextResponse.json({ ok: true, data: created }, { status: 201 });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to create packing profile');
    }
}
