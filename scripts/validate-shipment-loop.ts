/**
 * Shipment Loop Validation Script
 * 
 * Tests the full operational loop:
 * 1. Simulates a freight simulation saving
 * 2. Mocks a shipment creation in the DB
 * 3. Sends a webhook event mocking Melhor Envio
 * 4. Verifies if freight_confirmations captured the match.
 * 
 * Usage: npx tsx scripts/validate-shipment-loop.ts
 */

import { getDb } from '../src/infra/db';
import { freightSimulations, freightShipments, freightConfirmations } from '../src/drizzle/schema';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { logger } from '../src/infra/logger';
import { logFreightSimulation } from '../src/modules/freight/freight-audit';

const tenantId = 'LOJACOND';

import { POST as webhookHandler } from '../src/app/api/webhooks/melhor-envio/route';
import { NextRequest } from 'next/server';

async function mockWebhook(trackingCode: string, status: string) {
    logger.info('mocking webhook request', { trackingCode, status });

    const req = new NextRequest('http://localhost/api/webhooks/melhor-envio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            event: 'tracking.updated',
            payload: {
                tracking: trackingCode,
                status: status
            }
        })
    });

    const res = await webhookHandler(req);

    if (!res.ok) {
        throw new Error(`Webhook failed with ${res.status}`);
    }
}

async function run() {
    console.log('═'.repeat(60));
    console.log('  E2E SHIPMENT LOOP VALIDATION');
    console.log('═'.repeat(60));
    console.log();

    try {
        const db = await getDb();

        // 1. Create a dummy simulation first
        const simulationId = await logFreightSimulation({
            tenantId,
            cep: '88000000',
            zoneCode: 'SC-CAP',
            carrierConsidered: ['melhor_envio'],
            carrierSelected: 'Correios PAC',
            totalWeight: 5,
            cubedWeight: 2.5,
            chargedWeight: 5,
            totalVolumes: 1,
            volumeDetails: [],
            dimensionSource: 'script',
            quotedFreight: 25.50,
            breakdownJson: {},
            strategyUsed: 'melhor_envio',
        });

        if (!simulationId) throw new Error('Failed to create simulation mock');
        console.log(`✅ [1/4] Simulation created (ID: ${simulationId})`);

        // 2. Mock a generic shipment in DB waiting for webhook
        const shipmentId = randomUUID();
        const trackingCode = `SIM-${Date.now()}BR`;

        await db.insert(freightShipments).values({
            id: shipmentId,
            tenantId,
            simulationId,
            carrier: 'Correios',
            service: 'PAC',
            trackingCode,
            shipmentPrice: '28.00',
            status: 'pending',
        });

        console.log(`✅ [2/4] Shipment created (Tracking: ${trackingCode})`);

        // 3. Trigger Webhook
        console.log(`⏳ [3/4] Triggering Webhook for ${trackingCode} as 'posted'...`);
        await mockWebhook(trackingCode, 'posted');
        console.log(`✅ Webhook processed successfully.`);

        // Wait 2s for async fetch to confirm freight 
        await new Promise(r => setTimeout(r, 2000));

        // 4. Verify Freight Confirmation
        const confirmations = await db.select()
            .from(freightConfirmations)
            .where(eq(freightConfirmations.simulationId, simulationId))
            .limit(1);

        if (confirmations.length === 0) {
            console.log(`❌ [4/4] Freight confirmation NOT FOUND for simulation ${simulationId}`);
            process.exit(1);
        }

        const confirm = confirmations[0];
        console.log(`✅ [4/4] Freight confirmed successfully!`);
        console.log(`   Source: ${confirm.confirmationSource}`);
        console.log(`   Expected Freight: 25.50`);
        console.log(`   Confirmed Freight: ${confirm.confirmedFreight}`);
        console.log(`   Delta: ${confirm.deltaValue}`);

        console.log('\n═'.repeat(60));
        console.log('  ✅ ALL TESTS PASSED');
        console.log('═'.repeat(60));
        process.exit(0);

    } catch (err: any) {
        console.log(`\n❌ ERROR: ${err.message}`);
        console.error(err);
        process.exit(1);
    }
}

run();
