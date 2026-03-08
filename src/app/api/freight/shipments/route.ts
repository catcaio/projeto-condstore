import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { getDb } from '@/infra/db';
import { freightShipments, freightConfirmations } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { createShipmentFromQuote, CreateShipmentInput } from '@/modules/freight/adapters/melhor-envio-shipment';

export const dynamic = 'force-dynamic';

/**
 * GET /api/freight/shipments
 *
 * Returns up to 100 shipments for the authenticated tenant,
 * enriched with quoted/confirmed/delta values from freight_confirmations.
 */
export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;

    try {
        const db = await getDb();

        // Fetch shipments
        const shipments = await db
            .select()
            .from(freightShipments)
            .where(eq(freightShipments.tenantId, tenantId))
            .orderBy(desc(freightShipments.createdAt))
            .limit(100);

        if (shipments.length === 0) {
            return NextResponse.json({ ok: true, data: [] });
        }

        // Batch-fetch confirmations for these simulations
        const simulationIds = shipments
            .map((s) => s.simulationId)
            .filter((id): id is string => !!id);

        let confirmationMap: Map<string, typeof freightConfirmations.$inferSelect> = new Map();

        if (simulationIds.length > 0) {
            // Fetch confirmations for each simulationId (MySQL doesn't support IN with Drizzle arrays easily)
            const confirmationRows = await db
                .select()
                .from(freightConfirmations)
                .where(eq(freightConfirmations.tenantId, tenantId));

            for (const row of confirmationRows) {
                if (row.simulationId && !confirmationMap.has(row.simulationId)) {
                    confirmationMap.set(row.simulationId, row);
                }
            }
        }

        const data = shipments.map((s) => {
            const conf = s.simulationId ? confirmationMap.get(s.simulationId) : undefined;
            return {
                id: s.id,
                simulationId: s.simulationId,
                trackingCode: s.trackingCode,
                carrier: s.carrier,
                service: s.service,
                status: s.status,
                shipmentPrice: s.shipmentPrice ? parseFloat(String(s.shipmentPrice)) : null,
                quotedFreight: conf?.quotedFreight ? parseFloat(String(conf.quotedFreight)) : null,
                confirmedFreight: conf?.confirmedFreight
                    ? parseFloat(String(conf.confirmedFreight))
                    : null,
                deltaValue: conf?.deltaValue ? parseFloat(String(conf.deltaValue)) : null,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
            };
        });

        return NextResponse.json({ ok: true, data });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message);
    }
}

/**
 * POST /api/freight/shipments
 *
 * Creates a shipment label from a previous simulation quote.
 * Requires admin session.
 */
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
