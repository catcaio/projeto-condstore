/**
 * Freight Memory Aggregation Script.
 *
 * Groups confirmed freight records and computes aggregate memory entries.
 * Usage: npx tsx scripts/update-freight-memory.ts
 */

import { getDb } from '../src/infra/db';
import { freightConfirmations, freightMemory } from '../src/drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

function computeWeightBand(weight: number): string {
    if (weight <= 5) return '0-5';
    if (weight <= 10) return '5-10';
    if (weight <= 30) return '10-30';
    if (weight <= 100) return '30-100';
    if (weight <= 300) return '100-300';
    return '300+';
}

function computeVolumeBand(volumes: number): string {
    if (volumes <= 1) return '1';
    if (volumes <= 3) return '2-3';
    return '4+';
}

function confidenceFromCount(count: number): string {
    if (count >= 10) return 'high';
    if (count >= 4) return 'medium';
    return 'low';
}

async function main() {
    console.log('═'.repeat(60));
    console.log('  Freight Memory Aggregation');
    console.log('═'.repeat(60));

    const db = await getDb();

    // Fetch all CONFIRMED confirmations
    const confirmations = await db.select().from(freightConfirmations).where(
        eq(freightConfirmations.status, 'CONFIRMED'),
    );

    if (confirmations.length === 0) {
        console.log('\n  No confirmed freight records found.');
        console.log('  Memory table will not be updated.');
        console.log('\n  To test: insert a record into freight_confirmations with status=CONFIRMED');
        process.exit(0);
    }

    console.log(`\n  Found ${confirmations.length} confirmed records.`);

    // Group by aggregation key
    interface AggKey { tenantId: string; cepPrefix: string; zoneCode: string; carrierName: string; productFamily: string; weightBand: string; volumeBand: string; }
    const groups = new Map<string, { key: AggKey; totalFreight: number; totalDelta: number; count: number }>();

    for (const c of confirmations) {
        const cw = parseFloat(String(c.chargedWeight)) || 0;
        const wb = computeWeightBand(cw);
        const vb = computeVolumeBand(c.totalVolumes);
        const pf = (c.productFamily as string[] || [])[0] || 'unknown';
        const aggKey: AggKey = {
            tenantId: c.tenantId,
            cepPrefix: c.cepPrefix,
            zoneCode: c.zoneCode || '',
            carrierName: c.carrierName,
            productFamily: pf,
            weightBand: wb,
            volumeBand: vb,
        };
        const keyStr = JSON.stringify(aggKey);
        const existing = groups.get(keyStr);
        const confirmed = parseFloat(String(c.confirmedFreight)) || 0;
        const delta = parseFloat(String(c.deltaValue)) || 0;

        if (existing) {
            existing.totalFreight += confirmed;
            existing.totalDelta += delta;
            existing.count += 1;
        } else {
            groups.set(keyStr, { key: aggKey, totalFreight: confirmed, totalDelta: delta, count: 1 });
        }
    }

    console.log(`  Aggregated into ${groups.size} memory groups.`);

    // Upsert into freight_memory
    let updated = 0;
    for (const [, group] of groups) {
        const avg = group.totalFreight / group.count;
        const avgDelta = group.totalDelta / group.count;
        const confidence = confidenceFromCount(group.count);

        // Check if record exists
        const existing = await db.select().from(freightMemory).where(
            sql`${freightMemory.tenantId} = ${group.key.tenantId} 
            AND ${freightMemory.cepPrefix} = ${group.key.cepPrefix} 
            AND ${freightMemory.carrierName} = ${group.key.carrierName}
            AND COALESCE(${freightMemory.zoneCode}, '') = ${group.key.zoneCode}
            AND COALESCE(${freightMemory.weightBand}, '') = ${group.key.weightBand}`,
        ).limit(1);

        if (existing.length > 0) {
            await db.update(freightMemory).set({
                avgConfirmedFreight: String(Math.round(avg * 100) / 100),
                avgDelta: String(Math.round(avgDelta * 100) / 100),
                confirmationsCount: group.count,
                confidenceScore: confidence,
            }).where(eq(freightMemory.id, existing[0].id));
        } else {
            await db.insert(freightMemory).values({
                id: randomUUID(),
                tenantId: group.key.tenantId,
                cepPrefix: group.key.cepPrefix,
                zoneCode: group.key.zoneCode || null,
                carrierName: group.key.carrierName,
                productFamily: group.key.productFamily,
                weightBand: group.key.weightBand,
                volumeBand: group.key.volumeBand,
                avgConfirmedFreight: String(Math.round(avg * 100) / 100),
                avgDelta: String(Math.round(avgDelta * 100) / 100),
                confirmationsCount: group.count,
                confidenceScore: confidence,
            });
        }
        updated++;
    }

    console.log(`  Updated ${updated} memory records.`);
    console.log('\n' + '═'.repeat(60));
    console.log('  ✅ Freight memory aggregation complete');
    console.log('═'.repeat(60));
    process.exit(0);
}

main().catch(err => {
    console.error('Aggregation failed:', err);
    process.exit(1);
});
