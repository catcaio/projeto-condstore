import { getDb } from './src/infra/db';
import { carrierPolicies, carrierZones, carrierRateRows } from './src/drizzle/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.vercel.production' });

async function auditBraspress() {
    const db = await getDb();

    console.log("=== POLICIES ===");
    const policies = await db.select().from(carrierPolicies).where(eq(carrierPolicies.carrierName, 'BRASPRESS'));
    console.log(JSON.stringify(policies, null, 2));

    console.log("\n=== ZONES ===");
    const zones = await db.select().from(carrierZones).where(eq(carrierZones.carrierName, 'BRASPRESS'));
    console.log(`Total Zones: ${zones.length}`);
    console.log(JSON.stringify(zones.slice(0, 10), null, 2)); // Show first 10 for brevity

    console.log("\n=== RATE ROWS ===");
    const rates = await db.select().from(carrierRateRows).where(eq(carrierRateRows.carrierName, 'BRASPRESS'));
    console.log(`Total Rates: ${rates.length}`);

    // Group rates by zone to see which zones have rates
    const ratesByZone: Record<string, number> = {};
    for (const r of rates) {
        ratesByZone[r.zoneCode] = (ratesByZone[r.zoneCode] || 0) + 1;
    }
    console.log("Rates by Zone:", ratesByZone);

    process.exit(0);
}

auditBraspress().catch(console.error);
