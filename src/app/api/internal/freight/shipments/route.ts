/**
 * Shipments Internal API.
 * 
 * Lists shipments for the cockpit and allows generating new labels
 * directly from a previous simulation quote.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { freightShipments } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { createShipmentFromQuote, CreateShipmentInput } from '@/modules/freight/adapters/melhor-envio-shipment';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const db = await getDb();

    try {
        const shipments = await db.select()
            .from(freightShipments)
            .where(eq(freightShipments.tenantId, tenantId))
            .orderBy(desc(freightShipments.createdAt))
            .limit(100);

        return NextResponse.json({ ok: true, data: shipments });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message);
    }
}

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;

    try {
        const body = await request.json();
        const { simulationId, carrierName, serviceName, serviceId, quotePrice, dimensions, originCep, recipient } = body;

        if (!simulationId || !serviceId || !carrierName) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing required fields');
        }

        const input: CreateShipmentInput = {
            tenantId,
            simulationId,
            serviceId,
            carrierName,
            serviceName: serviceName || carrierName,
            quotePrice: parseFloat(quotePrice),
            dimensions,
            originCep,
            recipient,
        };

        const result = await createShipmentFromQuote(input);

        return NextResponse.json({ ok: true, data: result });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message);
    }
}
