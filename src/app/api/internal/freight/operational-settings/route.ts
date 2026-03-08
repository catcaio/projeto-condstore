import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { freightOperationalSettings, carrierPriorityRules } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { DEFAULTS, type SettingKey } from '@/core/freight/operational-settings';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET — Load all operational settings + carrier priorities for a tenant.
 */
export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const db = await getDb();

    const settings = await db.select().from(freightOperationalSettings).where(
        eq(freightOperationalSettings.tenantId, tenantId),
    );
    const priorities = await db.select().from(carrierPriorityRules).where(
        eq(carrierPriorityRules.tenantId, tenantId),
    );

    // Merge DB values with defaults so the UI always shows every setting
    const settingsMap: Record<string, { value: string; isActive: boolean; id?: string; description?: string; category?: string }> = {};
    for (const key of Object.keys(DEFAULTS) as SettingKey[]) {
        settingsMap[key] = {
            value: String(DEFAULTS[key]),
            isActive: true,
            description: '',
            category: key.startsWith('max_volume') || key.startsWith('max_identical') || key.startsWith('stacking') || key.startsWith('absorb') ? 'packing' : 'freight',
        };
    }
    for (const row of settings) {
        settingsMap[row.settingKey] = {
            value: row.settingValue,
            isActive: row.isActive,
            id: row.id,
            description: row.description ?? '',
            category: row.category,
        };
    }

    return NextResponse.json({ ok: true, data: { settings: settingsMap, priorities } });
}

// Validation guardrails
const GUARDRAILS: Record<string, { min?: number; max?: number }> = {
    max_identical_per_volume: { min: 1, max: 50 },
    stacking_increment_cm: { min: 0, max: 100 },
    max_volume_length_cm: { min: 10, max: 1000 },
    max_volume_width_cm: { min: 10, max: 1000 },
    max_volume_height_cm: { min: 10, max: 1000 },
    default_cubage_factor: { min: 100, max: 1000 },
    default_unit_weight_kg: { min: 0.01, max: 500 },
    max_freight_options: { min: 1, max: 20 },
};

/**
 * PATCH — Update a single operational setting.
 */
export async function PATCH(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const body = await request.json();

    // Setting update
    if (body.type === 'setting') {
        const { key, value } = body;
        if (!key || value === undefined) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing key or value');
        }

        // Validate guardrails
        const guard = GUARDRAILS[key];
        if (guard) {
            const num = parseFloat(value);
            if (isNaN(num)) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `${key} must be a number`);
            if (guard.min !== undefined && num < guard.min) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `${key} minimum is ${guard.min}`);
            if (guard.max !== undefined && num > guard.max) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `${key} maximum is ${guard.max}`);
        }

        const db = await getDb();
        const existing = await db.select().from(freightOperationalSettings).where(
            and(eq(freightOperationalSettings.tenantId, tenantId), eq(freightOperationalSettings.settingKey, key)),
        ).limit(1);

        if (existing.length > 0) {
            await db.update(freightOperationalSettings)
                .set({ settingValue: String(value) })
                .where(eq(freightOperationalSettings.id, existing[0].id));
        } else {
            await db.insert(freightOperationalSettings).values({
                id: randomUUID(),
                tenantId,
                settingKey: key,
                settingValue: String(value),
                category: key.startsWith('max_volume') || key.startsWith('max_identical') || key.startsWith('stacking') || key.startsWith('absorb') ? 'packing' : 'freight',
            });
        }

        return NextResponse.json({ ok: true, updated: key });
    }

    // Priority update
    if (body.type === 'priority') {
        const { id, fields } = body;
        if (!id || !fields) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing id or fields');
        const db = await getDb();
        await db.update(carrierPriorityRules).set(fields).where(
            and(eq(carrierPriorityRules.id, id), eq(carrierPriorityRules.tenantId, tenantId)),
        );
        return NextResponse.json({ ok: true, updated: id });
    }

    // Priority create
    if (body.type === 'priority_create') {
        const { regionGroup, carrierName, priorityOrder } = body;
        if (!regionGroup || !carrierName) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing regionGroup or carrierName');
        const db = await getDb();
        const id = randomUUID();
        await db.insert(carrierPriorityRules).values({
            id, tenantId, regionGroup, carrierName, priorityOrder: priorityOrder || 1,
        });
        return NextResponse.json({ ok: true, created: id });
    }

    return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Unknown type');
}
