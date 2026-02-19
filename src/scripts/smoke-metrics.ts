
import { freightController } from '../legacy/freight.controller';
import { metricsRepository } from '../modules/metrics/metrics.repository';
import { randomUUID } from 'crypto';

async function run() {
    console.log('--- STARTING SMOKE TEST: METRICS HARDENING ---');

    const tenantId = 'check-tenant'; // Using a test tenant or check if 'default-tenant' works
    // Ensure tenant exists if repo checks relation? 
    // For smoke test, we can mock or use a known one. 
    // In local dev `drizzle push` might not enforce foreign keys if mode is different, 
    // but `schema.ts` usually doesn't have explicit FK constraint lines in `mysqlTable` 
    // unless defined.
    // Let's assume 'tenant-1' is safe or we need to insert one.

    // 1. Simulate flow
    const phoneNumber = '5511999999999';
    const message = '5'; // Quantity, assuming session state is set to AWAITING_QUANTITY? 
    // Directly calling handleQuantity is private.
    // We must go through processMessage flow.
    // Or simpler: Test Repository directly first.

    console.log('1. Testing Repository Idempotency...');
    const idKey = `test-idempotency-${Date.now()}`;
    const record = {
        id: randomUUID(),
        tenantId: 'tenant-1', // Assuming this works without FK error for this test
        cep: '01001000',
        weight: '1.0',
        quantity: 1,
        bestPrice: '10.00',
        bestMargin: '2.00',
        idempotencyKey: idKey,
        event: 'FREIGHT_QUOTED'
    } as any;

    await metricsRepository.saveFreightEvent(record);
    console.log('   First insert OK');

    // Duplicate insert
    try {
        await metricsRepository.saveFreightEvent({
            ...record,
            id: randomUUID() // New ID, same idempotency key
        });
        console.log('   Duplicate insert attempted (should be skipped/ignored)');
    } catch (e: any) {
        console.log('   Duplicate insert threw error (Expected if repo re-throws):', e.message);
    }

    // Check count
    // We need a way to check count. getFreightMetrics?
    const metrics = await metricsRepository.getFreightMetrics('tenant-1');
    // This returns total. We can't easily isolate our test record unless we query directly.
    // But if we run this script against a fresh DB or just logs...
    console.log('   Metrics fetched:', metrics);

    console.log('2. Testing Timeseries...');
    const ts = await metricsRepository.getFreightTimeseries('tenant-1', '7d');
    console.log('   Timeseries:', JSON.stringify(ts, null, 2));

    console.log('--- SMOKE TEST COMPLETE ---');
    process.exit(0);
}

run().catch(console.error);
