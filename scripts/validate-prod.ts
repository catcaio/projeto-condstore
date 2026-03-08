import { getDb } from '../src/infra/db';
import { freightShipments, freightConfirmations, freightSimulations, freightMemory } from '../src/drizzle/schema';
import { randomUUID } from 'crypto';
import { eq, desc, and } from 'drizzle-orm';
import { logFreightSimulation } from '../src/modules/freight/freight-audit';
import { createShipmentFromQuote } from '../src/modules/freight/adapters/melhor-envio-shipment';

function generateCPF() {
    const n = (count: number) => Array(count).fill(0).map(() => Math.floor(Math.random() * 9));
    let cpf = n(9);
    let d1 = cpf.reduce((acc, val, i) => acc + val * (10 - i), 0) % 11;
    d1 = d1 < 2 ? 0 : 11 - d1;
    cpf.push(d1);
    let d2 = cpf.reduce((acc, val, i) => acc + val * (11 - i), 0) % 11;
    d2 = d2 < 2 ? 0 : 11 - d2;
    cpf.push(d2);
    return cpf.join('');
}

const tenantId = 'LOJACOND';

async function dispatchLiveWebhook(trackingCode: string, status: string) {
    console.log(`\n> Dispatching LIVE Webhook to VERCEL: ${status} for tracking ${trackingCode}`);
    const res = await fetch('https://projeto-condstore-28oh62ww3-rafael-s-projects-f32fc2d1.vercel.app/api/webhooks/melhor-envio', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Antigravity Prod Validation'
        },
        body: JSON.stringify({
            event: 'tracking.updated',
            payload: {
                tracking: trackingCode,
                status: status
            }
        })
    });

    const text = await res.text();
    console.log(`  Webhook Response HTTP: ${res.status} | Body: ${text}`);
    return res.ok;
}

async function run() {
    console.log('--- STARTING PROD OPERATIONAL VALIDATION ---');
    console.log('Connecting to TiDB...');
    const db = await getDb();

    // 1. Simulator
    console.log('\n[1] Simulating Quote on PROD DB...');
    const simulationId = await logFreightSimulation({
        tenantId,
        cep: '01001000',
        carrierConsidered: ['melhor_envio'],
        productFamily: ['test_prod'],
        totalWeight: 5,
        cubedWeight: 5,
        chargedWeight: 5,
        totalVolumes: 1,
        quotedFreight: 45.00,
        strategyUsed: 'melhor_envio',
    });
    console.log(`  Simulation ID: ${simulationId}`);

    // 2. Shipment Generation
    console.log('\n[2] Creating Live Sandbox Shipment...');
    const shipmentResponse = await createShipmentFromQuote({
        tenantId,
        simulationId,
        carrierName: 'Correios',
        serviceName: 'SEDEX',
        serviceId: 2,
        quotePrice: 45.00,
        dimensions: { weight: 5, length: 20, width: 20, height: 20 },
        originCep: '88131640',
        recipient: {
            name: 'Prod Auth User',
            phone: '11999999999',
            email: 'test@example.com',
            document: generateCPF(),
            address: 'Praca da Se',
            number: '1',
            district: 'Se',
            city: 'Sao Paulo',
            stateAbbr: 'SP',
            countryId: 'BR',
            postalCode: '01001000'
        }
    });

    console.log(`  Shipment ID: ${shipmentResponse.shipmentId}`);
    console.log(`  Tracking: ${shipmentResponse.trackingCode}`);

    // 3. Webhook Over Internet 
    console.log('\n[3] Ingesting Tracking via Vercel Webhook...');
    await dispatchLiveWebhook(shipmentResponse.trackingCode, 'posted');
    await new Promise(r => setTimeout(r, 2000));

    await dispatchLiveWebhook(shipmentResponse.trackingCode, 'in_transit');
    await new Promise(r => setTimeout(r, 2000));

    await dispatchLiveWebhook(shipmentResponse.trackingCode, 'delivered');
    await new Promise(r => setTimeout(r, 4000)); // give Vercel serverless time to write to DB

    // 4. Assertion
    console.log('\n[4] Asserting Prod Database State...');

    // Freight Shipments
    const s = await db.select().from(freightShipments).where(eq(freightShipments.id, shipmentResponse.shipmentId)).limit(1);
    if (s.length && s[0].status === 'delivered') {
        console.log('  [PASS] freight_shipments updated to delivered');
    } else {
        console.log(`  [FAIL] freight_shipments is ${s.length ? s[0].status : 'NOT FOUND'}`);
    }

    // Freight Confirmations
    const c = await db.select().from(freightConfirmations).where(eq(freightConfirmations.simulationId, simulationId));
    if (c.length) {
        console.log(`  [PASS] freight_confirmations created. Delta: ${c[0].deltaValue}`);
    } else {
        console.log('  [FAIL] freight_confirmations not found');
    }

    // Freight Memory
    const m = await db.select().from(freightMemory).where(
        and(eq(freightMemory.cepPrefix, '01001'), eq(freightMemory.carrierName, 'Correios'))
    ).limit(1);

    if (m.length) {
        console.log(`  [PASS] freight_memory found. Score: ${m[0].confidenceScore}, Count: ${m[0].confirmationsCount}`);
    } else {
        console.log('  [WARN] freight_memory view not synchronously updated or empty');
    }

    console.log('\n--- VALIDATION COMPLETE ---');
    process.exit(0);
}

run();
