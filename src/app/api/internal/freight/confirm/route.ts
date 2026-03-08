import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { freightSimulations, freightConfirmations } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

interface ConfirmBody {
    simulationId: string;
    orderId?: string;
    confirmedFreight: number;
    carrierName: string;
    confirmationSource?: string;
}

/**
 * POST — Confirm a freight quote (create freight_confirmations record).
 */
export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const body: ConfirmBody = await request.json();

    const { simulationId, orderId, confirmedFreight, carrierName, confirmationSource } = body;

    if (!simulationId || !carrierName || confirmedFreight == null) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing simulationId, carrierName, or confirmedFreight');
    }

    if (confirmedFreight < 0) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'confirmedFreight cannot be negative');
    }

    const db = await getDb();

    // Look up original simulation
    const simRows = await db.select().from(freightSimulations).where(
        and(eq(freightSimulations.id, simulationId), eq(freightSimulations.tenantId, tenantId)),
    ).limit(1);

    if (simRows.length === 0) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Simulation not found');
    }

    const sim = simRows[0];
    const quotedFreight = sim.quotedFreight ? parseFloat(String(sim.quotedFreight)) : 0;
    const delta = confirmedFreight - quotedFreight;

    const id = randomUUID();
    await db.insert(freightConfirmations).values({
        id,
        tenantId,
        simulationId,
        orderId: orderId ?? null,
        cep: sim.cep,
        cepPrefix: sim.cepPrefix,
        zoneCode: sim.zoneCode ?? null,
        carrierName,
        productHash: sim.productHash ?? null,
        productFamily: sim.productFamily ?? null,
        totalWeight: sim.totalWeight,
        chargedWeight: sim.chargedWeight,
        totalVolumes: sim.totalVolumes,
        quotedFreight: String(quotedFreight),
        confirmedFreight: String(confirmedFreight),
        deltaValue: String(Math.round(delta * 100) / 100),
        confirmationSource: confirmationSource ?? 'cockpit',
        status: 'CONFIRMED',
    });

    return NextResponse.json({
        ok: true,
        data: {
            confirmationId: id,
            simulationId,
            quotedFreight,
            confirmedFreight,
            delta: Math.round(delta * 100) / 100,
            status: 'CONFIRMED',
        },
    });
}
