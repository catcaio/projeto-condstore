import { getDb } from './src/infra/db';
import { carrierZones, carrierRateRows } from './src/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.vercel.production' });

async function patchBraspress() {
    const db = await getDb();

    console.log("Starting Braspress DB patch...");

    // 1. Delete all corrupt zones and rates for tenant1
    console.log("Deleting invalid tenant1 zones...");
    const deletedZones = await db.delete(carrierZones).where(and(
        eq(carrierZones.tenantId, 'tenant1'),
        eq(carrierZones.carrierName, 'BRASPRESS')
    ));

    console.log("Deleting invalid tenant1 rates...");
    const deletedRates = await db.delete(carrierRateRows).where(and(
        eq(carrierRateRows.tenantId, 'tenant1'),
        eq(carrierRateRows.carrierName, 'BRASPRESS')
    ));

    // 2. Fetch valid zones and rates from LOJACOND
    const validZones = await db.select().from(carrierZones).where(and(
        eq(carrierZones.tenantId, 'LOJACOND'),
        eq(carrierZones.carrierName, 'BRASPRESS')
    ));

    const validRates = await db.select().from(carrierRateRows).where(and(
        eq(carrierRateRows.tenantId, 'LOJACOND'),
        eq(carrierRateRows.carrierName, 'BRASPRESS')
    ));

    console.log(`Found ${validZones.length} valid zones and ${validRates.length} valid rates in LOJACOND`);

    if (validZones.length === 0) {
        console.error("No valid zones found to copy!");
        process.exit(1);
    }

    // 3. Insert copied zones for tenant1
    const newZones = validZones.map(z => ({
        ...z,
        id: uuidv4(),
        tenantId: 'tenant1',
        createdAt: new Date()
    }));

    console.log(`Inserting ${newZones.length} zones for tenant1...`);
    // Insert in batches if needed, but 120 is usually fine
    await db.insert(carrierZones).values(newZones);

    // 4. Insert copied rates for tenant1
    const newRates = validRates.map(r => ({
        ...r,
        id: uuidv4(),
        tenantId: 'tenant1',
        createdAt: new Date(),
        updatedAt: new Date()
    }));

    console.log(`Inserting ${newRates.length} rates for tenant1...`);
    // Insert rates in chunks to avoid query limits
    const chunkSize = 100;
    for (let i = 0; i < newRates.length; i += chunkSize) {
        const chunk = newRates.slice(i, i + chunkSize);
        await db.insert(carrierRateRows).values(chunk);
    }

    console.log("Patch completed successfully!");
    process.exit(0);
}

patchBraspress().catch(console.error);
