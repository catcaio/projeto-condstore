import { freightController } from '../modules/freight/freight.controller';
import { getDb } from '../infra/db';
import { freightFunnelEvents, tenants } from '../drizzle/schema';
import { desc } from 'drizzle-orm';

async function run() {
    console.log('--- Starting Smoke Test ---');

    // Needs a real tenantId from the DB to avoid throwing TenantNotFound inside controller?
    // Actually, handleIncoming doesn't check if the tenant exists until it needs to, 
    // but let's use the first one available.
    const db = await getDb();
    const firstTenant = await db.select().from(tenants).limit(1);
    if (!firstTenant || firstTenant.length === 0) {
        console.log('No tenants found. Aborting.');
        process.exit(1);
    }
    const tenantId = firstTenant[0].id;
    const phoneNumber = '5511999999999';
    const messageSid = 'SMOKE_TEST_' + Date.now();

    console.log(`Using tenantId: ${tenantId}`);

    // 1. Start Flow
    const reply1 = await freightController.handleIncoming(tenantId, phoneNumber, 'Cotação frete', messageSid);
    console.log('Reply 1:', reply1);

    // 2. Provide CEP
    const reply2 = await freightController.handleIncoming(tenantId, phoneNumber, '01001-000', messageSid);
    console.log('Reply 2:', reply2);

    // 3. Provide Quantity
    const reply3 = await freightController.handleIncoming(tenantId, phoneNumber, '5', messageSid);
    console.log('Reply 3:', reply3);

    // Verify DB
    console.log('--- Verifying Database ---');
    const events = await db.select().from(freightFunnelEvents).orderBy(desc(freightFunnelEvents.createdAt)).limit(10);

    const testEvents = events.filter(e => e.phoneNumber === phoneNumber);
    console.log(`Found ${testEvents.length} events for phone: ${phoneNumber}`);
    testEvents.forEach(e => console.log(`- [${e.stage}] SessionId: ${e.sessionId}`));

    console.log('Done.');
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
