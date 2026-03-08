/**
 * Melhor Envio Webhook Receiver.
 * 
 * Handles push events for shipment tracking (e.g. tracking.updated)
 * and updates local freight_shipments status. Triggers freight confirm.
 * On `delivered`, also feeds freight_memory for intelligence aggregation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { freightShipments, freightSimulations } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import { confirmFreight } from '@/modules/freight/freight-audit';
import { upsertFreightMemory } from '@/modules/freight/freight-audit';

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

        // Auto freight confirmation on posted or delivered
        if (newStatus === 'posted' || newStatus === 'delivered') {
            if (shipment.simulationId) {
                const confirmedFreightValue = parseFloat(String(shipment.shipmentPrice || 0));

                // Non-blocking trigger to auto-confirm freight
                confirmFreight({
                    tenantId: shipment.tenantId,
                    simulationId: shipment.simulationId,
                    confirmedFreight: confirmedFreightValue,
                    carrierName: shipment.carrier,
                    confirmationSource: 'shipment_created',
                }).catch(err => {
                    logger.error('webhook:melhor_envio failed to trigger confirm', err instanceof Error ? err : undefined);
                });

                // Feed freight_memory on delivered (aggregate intelligence)
                if (newStatus === 'delivered') {
                    // Look up simulation for cep/zone context
                    db.select()
                        .from(freightSimulations)
                        .where(
                            and(
                                eq(freightSimulations.id, shipment.simulationId),
                                eq(freightSimulations.tenantId, shipment.tenantId),
                            )
                        )
                        .limit(1)
                        .then(async (sims) => {
                            const sim = sims[0];
                            if (!sim) return;

                            // Compute delta from simulation's quoted freight
                            const quotedFreight = sim.quotedFreight ? parseFloat(String(sim.quotedFreight)) : 0;
                            const deltaValue = confirmedFreightValue - quotedFreight;

                            await upsertFreightMemory({
                                tenantId: shipment.tenantId,
                                cepPrefix: sim.cepPrefix,
                                zoneCode: sim.zoneCode ?? null,
                                carrierName: shipment.carrier,
                                weightBand: null, // could derive from sim.chargedWeight if needed
                                volumeBand: null,
                                confirmedFreight: confirmedFreightValue,
                                deltaValue,
                            });

                            logger.info('webhook:melhor_envio freight_memory updated', {
                                trackingCode,
                                carrier: shipment.carrier,
                                cepPrefix: sim.cepPrefix,
                            });
                        })
                        .catch(err => {
                            logger.error('webhook:melhor_envio failed to feed memory', err instanceof Error ? err : undefined);
                        });
                }
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

