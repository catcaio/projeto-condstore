import { getDb } from '../src/infra/db';
import { freightShipments, freightConfirmations, freightSimulations } from '../src/drizzle/schema';
import { randomUUID } from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { POST as webhookHandler } from '../src/app/api/webhooks/melhor-envio/route';
import { NextRequest } from 'next/server';
import { logFreightSimulation } from '../src/modules/freight/freight-audit';
import { createShipmentFromQuote } from '../src/modules/freight/adapters/melhor-envio-shipment';

const tenantId = 'LOJACOND';

async function dispatchWebhook(trackingCode: string, status: string) {
    console.log(`\n> Dispatching Webhook Event: ${status} for tracking ${trackingCode}`);
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
    return res.ok;
}

async function runStep1() {
    console.log('\n--- STEP 1: Verify Melhor Envio webhook endpoint ---');
    const db = await getDb();

    const dummyId = randomUUID();
    const mockTracking = `TEST-${Date.now()}`;

    // Create dummy shipment for webhook test
    await db.insert(freightShipments).values({
        id: dummyId,
        tenantId,
        carrier: 'Test Carrier',
        service: 'Test Service',
        trackingCode: mockTracking,
        shipmentPrice: '15.00',
        status: 'pending',
    });

    // Test payloads
    const payloads = ['posted', 'in_transit', 'delivered'];
    for (const p of payloads) {
        await dispatchWebhook(mockTracking, p);
        const rows = await db.select().from(freightShipments).where(eq(freightShipments.id, dummyId));
        if (rows.length > 0) {
            console.log(`  State in DB: ${rows[0].status} (Expected: ${p})`);
        }

        // Let background confirmation run if any
        await new Promise(r => setTimeout(r, 1000));
    }
}

async function runStep345() {
    console.log('\n--- STEP 3, 4 & 5: Validate Shipment Creation, Auto confirm and Shipments Panel ---');

    console.log('Simulating Quote (CEP 01001-000, 5kg, 20x20x20)');

    // 1. We mock the simulator returning a ME quote
    const simulationId = await logFreightSimulation({
        tenantId,
        cep: '01001000',
        carrierConsidered: ['melhor_envio'],
        productFamily: ['test'],
        totalWeight: 5,
        chargedWeight: 5,
        totalVolumes: 1,
        quotedFreight: 35.00,
        strategyUsed: 'melhor_envio',
    });
    console.log(`  [OK] Simulation logged -> ${simulationId}`);

    // 2. Call the adapter directly (as if "Create Shipment" was clicked)
    // Note: this will actually hit the real ME sandbox API if tokens are configured.
    console.log('\nCalling createShipmentFromQuote...');
    try {
        const shipmentResponse = await createShipmentFromQuote({
            tenantId,
            simulationId,
            carrierName: 'Correios',
            serviceName: 'SEDEX',
            serviceId: 2, // Correios SEDEX in ME
            quotePrice: 35.00,
            dimensions: { weight: 5, length: 20, width: 20, height: 20 },
            originCep: '88131640',
            recipient: {
                name: 'Joao da Silva',
                phone: '11999999999',
                email: 'test@example.com',
                document: '12345678909',
                address: 'Praca da Se',
                number: '1',
                district: 'Se',
                city: 'Sao Paulo',
                stateAbbr: 'SP',
                countryId: 'BR',
                postalCode: '01001000'
            }
        });

        console.log(`  [OK] Shipment created in sandbox!`);
        console.log(`  Shipment ID: ${shipmentResponse.shipmentId}`);
        console.log(`  Tracking Code: ${shipmentResponse.trackingCode}`);

        // 3. Dispatch 'delivered' webhook to test auto-confirmation using real tracking
        await dispatchWebhook(shipmentResponse.trackingCode, 'delivered');
        await new Promise(r => setTimeout(r, 1500));

        console.log('\nChecking Auto-Confirmation (freight_confirmations)...');
        const db = await getDb();
        const confs = await db.select().from(freightConfirmations).where(eq(freightConfirmations.simulationId, simulationId));
        if (confs.length > 0) {
            console.log(`  [OK] Confirmation found: ${confs[0].confirmationSource}`);
            console.log(`  Delta: ${confs[0].deltaValue}`);
        } else {
            console.log(`  [FAIL] No confirmation found for simulation`);
        }

    } catch (err: any) {
        console.error('Shipment creation failed:', err.message);
        console.error('Do you have MELHOR_ENVIO_TOKEN in .env.local?');
    }
}

async function run() {
    await runStep1();
    await runStep345();
    process.exit(0);
}

run();
