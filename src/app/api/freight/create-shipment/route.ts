/**
 * Create Shipment from Quote.
 *
 * POST /api/freight/create-shipment
 * Creates a freight_shipments record from a previous simulation/quote,
 * and registers a freight_confirmations entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { freightShipments, freightSimulations } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { confirmFreight } from '@/modules/freight/freight-audit';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

interface CreateShipmentBody {
    simulationId: string;
    carrier: string;
    price: number;
}

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;

    try {
        const body: CreateShipmentBody = await request.json();
        const { simulationId, carrier, price } = body;

        if (!simulationId || !carrier || price == null) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing required fields: simulationId, carrier, price');
        }

        const db = await getDb();

        // Validate simulation exists
        const sims = await db.select().from(freightSimulations).where(
            and(eq(freightSimulations.id, simulationId), eq(freightSimulations.tenantId, tenantId))
        ).limit(1);

        if (sims.length === 0) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Simulation not found');
        }

        // Create shipment
        const shipmentId = randomUUID();
        await db.insert(freightShipments).values({
            id: shipmentId,
            tenantId,
            simulationId,
            carrier,
            service: carrier, // Use carrier name as service for simplified flow
            shipmentPrice: String(price),
            status: 'pending',
        });

        // Create freight confirmation (registers quoted vs confirmed delta)
        await confirmFreight({
            tenantId,
            simulationId,
            confirmedFreight: price,
            carrierName: carrier,
            confirmationSource: 'sales_quote',
        });

        return NextResponse.json({
            ok: true,
            data: { shipmentId },
        });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message || 'Shipment creation failed');
    }
}
