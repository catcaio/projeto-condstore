/**
 * Melhor Envio Webhook Receiver.
 * 
 * Handles push events for shipment tracking (e.g. tracking.updated)
 * and updates local freight_shipments status. Triggers freight confirm.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { freightShipments } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import { confirmFreight } from '@/modules/freight/freight-audit';

// TODO: Validate webhook signature using secret when documented
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        logger.info('webhook:melhor_envio received', { event: body });

        // Expected format from ME: 
        // { "id": "123", "event": "tracking.updated", "payload": { "id": "123", "status": "posted", "tracking": "XX123BR" } }

        const trackingCode = body.payload?.tracking || body.tracking;
        const newStatus = body.payload?.status || body.status;

        if (!trackingCode || !newStatus) {
            return NextResponse.json({ ok: false, error: 'Missing tracking or status' }, { status: 400 });
        }

        const db = await getDb();
        const shipments = await db.select().from(freightShipments).where(eq(freightShipments.trackingCode, trackingCode)).limit(1);

        if (shipments.length === 0) {
            logger.warn('webhook:melhor_envio unknown tracking', { trackingCode });
            return NextResponse.json({ ok: false, error: 'Tracking not found' }, { status: 404 });
        }

        const shipment = shipments[0];

        await db.update(freightShipments)
            .set({ status: newStatus })
            .where(eq(freightShipments.id, shipment.id));

        logger.info('webhook:melhor_envio shipment updated', {
            id: shipment.id, trackingCode, newStatus
        });

        // Auto freight confirmation
        if (newStatus === 'posted' || newStatus === 'delivered') {
            if (shipment.simulationId) {
                // Non-blocking trigger to auto-confirm freight
                confirmFreight({
                    tenantId: shipment.tenantId,
                    simulationId: shipment.simulationId,
                    confirmedFreight: parseFloat(String(shipment.shipmentPrice || 0)),
                    carrierName: shipment.carrier,
                    confirmationSource: 'shipment_created', // Matches user requirement
                }).catch(err => {
                    logger.error('webhook:melhor_envio failed to trigger confirm', err instanceof Error ? err : undefined);
                });
            } else {
                logger.warn('webhook:melhor_envio shipment has no simulationId, skipping confirm', { trackingCode });
            }
        }

        return NextResponse.json({ ok: true });

    } catch (err) {
        logger.error('webhook:melhor_envio fatal error', err instanceof Error ? err : undefined);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
