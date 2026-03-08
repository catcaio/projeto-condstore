import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { freightSimulations, freightConfirmations } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { confirmFreight } from '@/modules/freight/freight-audit';

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

    try {
        const { confirmationId } = await confirmFreight({
            tenantId,
            simulationId,
            orderId,
            confirmedFreight,
            carrierName,
            confirmationSource
        });

        return NextResponse.json({
            ok: true,
            data: {
                confirmationId,
                simulationId,
                confirmedFreight,
                status: 'CONFIRMED',
            },
        });
    } catch (err: any) {
        if (err.message === 'Simulation not found') {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Simulation not found');
        }
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message);
    }
}
