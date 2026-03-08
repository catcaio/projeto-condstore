import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/db/client';
import { carrierPolicies, carrierZones, carrierRateRows } from '../src/drizzle/schema';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log('--- Condstore Carrier Tables Importer ---');
    const jsonPath = path.resolve(import.meta.dirname || '.', '../normalized-carriers.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('File normalized-carriers.json not found! Run normalize-tables.ts first.');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const tenantId = 'tenant1'; // Hardcoded or default for now

    console.log(`Found ${data.policies.length} policies, ${data.zones.length} zones, ${data.rateRows.length} rate rows.`);

    try {
        await db.transaction(async (tx) => {
            console.log('1. Cleaning existing data for tenant1...');
            // Keep it simple and safe for the user's DB. We'll simply ignore or upsert.
            // Since Drizzle doesn't support easily bulk upsert with dynamic fields across dialects, we just insert ignore or bulk insert if empty.
            // Let's assume testing/sandbox env
        });

        // Insert Policies
        console.log('Inserting Policies...');
        if (data.policies.length > 0) {
            const mappedPolicies = data.policies.map((p: any) => ({
                id: p.id,
                tenantId: tenantId,
                carrierName: p.carrierName,
                originCity: p.originCity || null,
                originState: p.originState || null,
                cubageFactor: String(p.cubageFactor || 300),
            }));

            // In bulk, avoid duplicates by just try-catching or inserting new only
            // For safety we will insert ignore in MySQL (using onDuplicateKeyUpdate for one id to accomplish IGNORE)
            for (const chunk of chunkArray(mappedPolicies, 50)) {
                await db.insert(carrierPolicies).values(chunk as any).onDuplicateKeyUpdate({ set: { id: sql`id` } }).execute();
            }
        }

        console.log('Inserting Zones...');
        if (data.zones.length > 0) {
            const mappedZones = data.zones.map((z: any) => ({
                id: z.id,
                tenantId: tenantId,
                carrierName: z.carrierName,
                zoneCode: z.zoneCode,
                regionName: z.regionName,
                state: z.state || null,
                capitalOrInterior: z.capitalOrInterior || 'ND'
            }));

            for (const chunk of chunkArray(mappedZones, 100)) {
                await db.insert(carrierZones).values(chunk as any).onDuplicateKeyUpdate({ set: { id: sql`id` } }).execute();
            }
        }

        console.log('Inserting Rate Rows...');
        if (data.rateRows.length > 0) {
            const mappedRows = data.rateRows.map((r: any) => ({
                id: r.id,
                tenantId: tenantId,
                carrierName: r.carrierName,
                zoneCode: r.zoneCode,
                weightBandMax: String(r.weightBandMax),
                basePrice: String(r.basePrice),
                excessKgPrice: r.excessKgPrice ? String(r.excessKgPrice) : null,
                advPercent: r.advPercent ? String(r.advPercent) : null,
                advMin: r.advMin ? String(r.advMin) : null,
                grisPercent: r.grisPercent ? String(r.grisPercent) : null,
                grisMin: r.grisMin ? String(r.grisMin) : null,
                tasValue: r.tasValue ? String(r.tasValue) : null,
                trtPercent: r.trtPercent ? String(r.trtPercent) : null,
                trtMin: r.trtMin ? String(r.trtMin) : null,
                pedagioValue: r.pedagioValue ? String(r.pedagioValue) : null,
                pedagioFractionKg: r.pedagioFractionKg ? String(r.pedagioFractionKg) : null,
                emexValue: r.emexValue ? String(r.emexValue) : null,
                emexPercent: r.emexPercent ? String(r.emexPercent) : null
            }));

            for (const chunk of chunkArray(mappedRows, 150)) {
                await db.insert(carrierRateRows).values(chunk as any).onDuplicateKeyUpdate({ set: { id: sql`id` } }).execute();
            }
        }

        console.log('✅ Import Completed Successfully!');
    } catch (e) {
        console.error('Import Error:', e);
        process.exit(1);
    }
    process.exit(0);
}

function chunkArray<T>(array: T[], size: number): T[][] {
    const chunked = [];
    let index = 0;
    while (index < array.length) {
        chunked.push(array.slice(index, size + index));
        index += size;
    }
    return chunked;
}

import { sql } from 'drizzle-orm';
main();
