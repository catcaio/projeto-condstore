/**
 * Freight Audit Service.
 *
 * Handles insertion of simulation logs and confirmation records.
 * Also provides memory lookup for diagnostic comparison.
 */

import { getDb } from '../../infra/db';
import { freightSimulations, freightConfirmations, freightMemory } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

// ─── Product hash utility ───────────────────────────────────────────────────

export function computeProductHash(refs: string[]): string {
    const sorted = [...refs].sort().join('|');
    return createHash('sha256').update(sorted).digest('hex').substring(0, 16);
}

export function computeWeightBand(weight: number): string {
    if (weight <= 5) return '0-5';
    if (weight <= 10) return '5-10';
    if (weight <= 30) return '10-30';
    if (weight <= 100) return '30-100';
    if (weight <= 300) return '100-300';
    return '300+';
}

export function computeVolumeBand(volumes: number): string {
    if (volumes <= 1) return '1';
    if (volumes <= 3) return '2-3';
    return '4+';
}

// ─── Simulation logging ─────────────────────────────────────────────────────

export interface SimulationLogInput {
    tenantId: string;
    cep: string;
    zoneCode?: string;
    carrierConsidered: string[];
    carrierSelected?: string;
    productRefs?: string[];
    productFamily?: string[];
    totalWeight: number;
    cubedWeight?: number;
    chargedWeight: number;
    totalVolumes: number;
    volumeDetails?: any;
    dimensionSource?: string;
    packingRuleVersion?: number;
    quotedFreight?: number;
    breakdownJson?: any;
    strategyUsed?: string;
}

export async function logFreightSimulation(input: SimulationLogInput): Promise<string> {
    const id = randomUUID();
    const cepClean = input.cep.replace(/\D/g, '');
    const cepPrefix = cepClean.substring(0, 5);

    try {
        const db = await getDb();
        await db.insert(freightSimulations).values({
            id,
            tenantId: input.tenantId,
            cep: cepClean,
            cepPrefix,
            zoneCode: input.zoneCode ?? null,
            carrierConsidered: input.carrierConsidered,
            carrierSelected: input.carrierSelected ?? null,
            productHash: input.productRefs ? computeProductHash(input.productRefs) : null,
            productRefs: input.productRefs ?? null,
            productFamily: input.productFamily ?? null,
            totalWeight: String(input.totalWeight),
            cubedWeight: input.cubedWeight != null ? String(input.cubedWeight) : null,
            chargedWeight: String(input.chargedWeight),
            totalVolumes: input.totalVolumes,
            volumeDetails: input.volumeDetails ?? null,
            dimensionSource: input.dimensionSource ?? null,
            packingRuleVersion: input.packingRuleVersion ?? null,
            quotedFreight: input.quotedFreight != null ? String(input.quotedFreight) : null,
            breakdownJson: input.breakdownJson ?? null,
            strategyUsed: input.strategyUsed ?? null,
        });
    } catch (err) {
        // Non-blocking — don't crash freight calculation if logging fails
        console.error('logFreightSimulation inserted failed:', err);
    }

    return id;
}

// ─── Memory lookup (diagnostic, read-only) ──────────────────────────────────

export interface MemoryMatch {
    memoryMatch: boolean;
    memoryDelta: number | null;
    avgConfirmedFreight: number | null;
    confidenceScore: string;
    confirmationsCount: number;
}

export async function lookupFreightMemory(
    tenantId: string,
    cepPrefix: string,
    carrierName: string,
    zoneCode?: string,
): Promise<MemoryMatch> {
    const noMatch: MemoryMatch = {
        memoryMatch: false,
        memoryDelta: null,
        avgConfirmedFreight: null,
        confidenceScore: 'none',
        confirmationsCount: 0,
    };

    try {
        const db = await getDb();
        const conditions = [
            eq(freightMemory.tenantId, tenantId),
            eq(freightMemory.cepPrefix, cepPrefix),
            eq(freightMemory.carrierName, carrierName),
        ];
        if (zoneCode) conditions.push(eq(freightMemory.zoneCode, zoneCode));

        const rows = await db.select().from(freightMemory).where(and(...conditions)).limit(1);

        if (rows.length === 0) return noMatch;

        const row = rows[0];
        return {
            memoryMatch: true,
            memoryDelta: row.avgDelta ? parseFloat(String(row.avgDelta)) : null,
            avgConfirmedFreight: row.avgConfirmedFreight ? parseFloat(String(row.avgConfirmedFreight)) : null,
            confidenceScore: row.confidenceScore,
            confirmationsCount: row.confirmationsCount,
        };
    } catch {
        return noMatch;
    }
}

// ─── Direct Confirmation ────────────────────────────────────────────────────

export interface ConfirmInput {
    tenantId: string;
    simulationId: string;
    orderId?: string;
    confirmedFreight: number;
    carrierName: string;
    confirmationSource?: string;
}

export async function confirmFreight(input: ConfirmInput): Promise<{ confirmationId: string }> {
    const { tenantId, simulationId, orderId, confirmedFreight, carrierName, confirmationSource } = input;

    if (confirmedFreight < 0) {
        throw new Error('confirmedFreight cannot be negative');
    }

    const db = await getDb();
    const simRows = await db.select().from(freightSimulations).where(
        and(eq(freightSimulations.id, simulationId), eq(freightSimulations.tenantId, tenantId)),
    ).limit(1);

    if (simRows.length === 0) {
        throw new Error('Simulation not found');
    }

    const sim = simRows[0];
    const quotedFreight = sim.quotedFreight ? parseFloat(String(sim.quotedFreight)) : 0;
    const delta = confirmedFreight - quotedFreight;

    const id = randomUUID();
    await db.insert(freightConfirmations).values({
        id,
        tenantId,
        simulationId,
        orderId: orderId ?? null,
        cep: sim.cep,
        cepPrefix: sim.cepPrefix,
        zoneCode: sim.zoneCode ?? null,
        carrierName,
        productHash: sim.productHash ?? null,
        productFamily: sim.productFamily ?? null,
        totalWeight: sim.totalWeight,
        chargedWeight: sim.chargedWeight,
        totalVolumes: sim.totalVolumes,
        quotedFreight: String(quotedFreight),
        confirmedFreight: String(confirmedFreight),
        deltaValue: String(Math.round(delta * 100) / 100),
        confirmationSource: confirmationSource ?? 'cockpit',
        status: 'CONFIRMED',
    });

    return { confirmationId: id };
}
