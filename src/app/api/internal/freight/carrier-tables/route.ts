import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { carrierPolicies, carrierZones, carrierRateRows } from '@/drizzle/schema';
import { eq, sql, and } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const db = await getDb();
        const tenantId = auth.session.tenantId;

        const policies = await db.select().from(carrierPolicies).where(
            eq(carrierPolicies.tenantId, tenantId),
        );

        const zones = await db.select().from(carrierZones).where(
            eq(carrierZones.tenantId, tenantId),
        );

        // Summary per carrier: zone count + rate row count
        const rateCountResult = await db.execute(sql`
            SELECT carrier_name, COUNT(*) as row_count, COUNT(DISTINCT zone_code) as zone_count
            FROM carrier_rate_rows WHERE tenant_id = ${tenantId}
            GROUP BY carrier_name
        `);

        const rateSummary = Array.isArray((rateCountResult as any)[0])
            ? (rateCountResult as any)[0]
            : [];

        // Load rate rows (capped)
        const rates = await db.select().from(carrierRateRows).where(
            eq(carrierRateRows.tenantId, tenantId),
        );

        return NextResponse.json({
            ok: true,
            data: {
                policies,
                zones,
                rateSummary,
                rates,
            },
        });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to load carrier tables');
    }
}

export async function PATCH(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    try {
        const db = await getDb();
        const tenantId = auth.session.tenantId;
        const body = await request.json();
        const { table, id, fields } = body;

        if (!table || !id || !fields) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing table, id, or fields');
        }

        const tableMap: Record<string, any> = {
            carrier_policies: carrierPolicies,
            carrier_zones: carrierZones,
            carrier_rate_rows: carrierRateRows,
        };

        const schema = tableMap[table];
        if (!schema) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, `Invalid table: ${table}`);
        }

        await db.update(schema).set(fields).where(
            and(eq(schema.id, id), eq(schema.tenantId, tenantId)),
        );

        return NextResponse.json({ ok: true, updated: id });
    } catch (err) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to update carrier table');
    }
}
