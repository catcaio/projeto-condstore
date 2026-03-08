/**
 * Freight Memory Aggregation Script — Incremental.
 *
 * Groups confirmed freight records and computes aggregate memory entries.
 * Only processes confirmations newer than the last aggregation timestamp.
 *
 * Usage: npx tsx scripts/update-freight-memory.ts
 */

import { getDb } from '../src/infra/db';
import { freightConfirmations, freightMemory } from '../src/drizzle/schema';
import { eq, sql, gt, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = path.join(__dirname, '.freight-memory-lastrun.json');

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

function loadLastRun(): Date | null {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
            return new Date(data.lastRun);
        }
    } catch { /* noop */ }
    return null;
}

function saveLastRun(ts: Date): void {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastRun: ts.toISOString() }));
}

async function main() {
    console.log('═'.repeat(60));
    console.log('  Freight Memory Aggregation (Incremental)');
    console.log('═'.repeat(60));

    const lastRun = loadLastRun();
    const runTs = new Date();

    if (lastRun) {
        console.log(`\n  Last run: ${lastRun.toISOString()}`);
        console.log(`  Processing confirmations since then...`);
    } else {
        console.log(`\n  First run — processing all confirmations`);
    }

    const db = await getDb();

    // Fetch CONFIRMED confirmations (incremental: only newer than last run)
    const conditions = [eq(freightConfirmations.status, 'CONFIRMED')];
    if (lastRun) {
        conditions.push(gt(freightConfirmations.createdAt, lastRun));
    }

    const confirmations = await db.select().from(freightConfirmations).where(and(...conditions));

    if (confirmations.length === 0) {
        console.log('\n  No new confirmed records since last aggregation.');
        saveLastRun(runTs);
        process.exit(0);
    }

    console.log(`\n  Found ${confirmations.length} new confirmed records.`);

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

    // Upsert into freight_memory (merge new data into existing records)
    let updated = 0;
    for (const [, group] of groups) {
        // Check if record exists
        const existing = await db.select().from(freightMemory).where(
            sql`${freightMemory.tenantId} = ${group.key.tenantId} 
            AND ${freightMemory.cepPrefix} = ${group.key.cepPrefix} 
            AND ${freightMemory.carrierName} = ${group.key.carrierName}
            AND COALESCE(${freightMemory.zoneCode}, '') = ${group.key.zoneCode}
            AND COALESCE(${freightMemory.weightBand}, '') = ${group.key.weightBand}`,
        ).limit(1);

        if (existing.length > 0) {
            // Merge: weighted average with existing counts
            const oldCount = existing[0].confirmationsCount;
            const oldAvg = parseFloat(String(existing[0].avgConfirmedFreight)) || 0;
            const oldDelta = parseFloat(String(existing[0].avgDelta)) || 0;
            const totalCount = oldCount + group.count;
            const newAvg = ((oldAvg * oldCount) + group.totalFreight) / totalCount;
            const newDelta = ((oldDelta * oldCount) + group.totalDelta) / totalCount;
            const confidence = confidenceFromCount(totalCount);

            await db.update(freightMemory).set({
                avgConfirmedFreight: String(Math.round(newAvg * 100) / 100),
                avgDelta: String(Math.round(newDelta * 100) / 100),
                confirmationsCount: totalCount,
                confidenceScore: confidence,
            }).where(eq(freightMemory.id, existing[0].id));
        } else {
            const avg = group.totalFreight / group.count;
            const avgDelta = group.totalDelta / group.count;
            const confidence = confidenceFromCount(group.count);

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

    saveLastRun(runTs);

    console.log(`  Updated ${updated} memory records.`);
    console.log(`  Last run timestamp saved: ${runTs.toISOString()}`);
    console.log('\n' + '═'.repeat(60));
    console.log('  ✅ Incremental freight memory aggregation complete');
    console.log('═'.repeat(60));
    process.exit(0);
}

main().catch(err => {
    console.error('Aggregation failed:', err);
    process.exit(1);
});
