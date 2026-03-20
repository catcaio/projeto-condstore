/**
 * Melhor Envio Webhook Receiver.
 * 
 * Handles push events for shipment tracking (e.g. tracking.updated)
 * and updates local freight_shipments status. Triggers freight confirm.
 * On `delivered`, also feeds freight_memory for intelligence aggregation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { freightSimulations } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import { structuredLogger } from '@/infra/log/logger';
import { confirmFreight } from '@/modules/freight/freight-audit';
import { upsertFreightMemory } from '@/modules/freight/freight-audit';
import { verifyMelhorEnvioWebhook } from '@/lib/security/melhorenvio-webhook-verifier';
import { findFreightShipmentByExternalShipmentId, updateFreightShipmentStatus } from '@/modules/freight/server';

export async function POST(request: NextRequest) {
    // ── Webhook signature verification ────────────────────────────────
    const verification = verifyMelhorEnvioWebhook(request);
    if (!verification.valid) {
        structuredLogger.warn('webhook_melhorenvio_rejected', {
            eventType: 'webhook_auth_failed',
            reason: verification.reason,
            route: '/api/webhooks/melhor-envio',
        });
        const status = verification.reason === 'secret_not_configured' ? 503 : 401;
        return NextResponse.json(
            { ok: false, error: verification.reason === 'secret_not_configured' ? 'Webhook not configured' : 'Unauthorized' },
            { status },
        );
    }

    try {
        const body = await request.json();
        logger.info('webhook:melhor_envio received', { event: body.event ?? 'unknown' });

        // Expected format from ME:
        // { "event": "order.posted", "data": { "id": "uuid", "status": "posted", "tracking": "XX123BR" } }
        // Keep payload/body fallbacks for compatibility with older local fixtures.
        const eventData = body.data ?? body.payload ?? body;

        const externalShipmentId = eventData?.id ?? body.id;
        const trackingCode = eventData?.tracking ?? body.tracking ?? null;
        const newStatus = eventData?.status ?? body.status;

        if (!externalShipmentId || !newStatus) {
            return NextResponse.json({ ok: false, error: 'Missing shipment id or status' }, { status: 400 });
        }

        const shipment = await findFreightShipmentByExternalShipmentId(externalShipmentId, trackingCode);

        if (!shipment) {
            logger.warn('webhook:melhor_envio unknown shipment', { externalShipmentId, trackingCode });
            return NextResponse.json({ ok: false, error: 'Shipment not found' }, { status: 404 });
        }

        const db = await getDb();

        await updateFreightShipmentStatus(shipment.tenantId, shipment.id, newStatus);

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

