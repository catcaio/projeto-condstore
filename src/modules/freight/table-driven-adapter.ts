/**
 * Table-Driven Carrier Adapter.
 * Replaces the flat CSV lookup with a DB-driven multi-carrier engine.
 * Supports zone resolution, cubed weight, and full fee composition.
 */

import { getDb } from '../../infra/db';
import { carrierPolicies, carrierZones, carrierRateRows } from '../../drizzle/schema';
import { eq, and, gte, asc } from 'drizzle-orm';
import { logger } from '../../infra/logger';
import type { CarrierAdapter, QuoteInput, NormalizedQuote } from '../shipping/carriers/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FreightBreakdown {
    carrierName: string;
    zoneCode: string;
    realWeightKg: number;
    cubedWeightKg: number;
    chargedWeightKg: number;
    weightBand: number;
    basePrice: number;
    excessKgCharge: number;
    advCharge: number;
    grisCharge: number;
    tasCharge: number;
    trtCharge: number;
    pedagioCharge: number;
    emexCharge: number;
    txaCharge: number;
    fpkCharge: number;
    fvCharge: number;
    totalFreight: number;
    deliveryDays: number;
}

// ─── CEP → State mapping ───────────────────────────────────────────────────

const CEP_STATE_MAP: [number, number, string][] = [
    [1000000, 19999999, 'SP'],
    [20000000, 28999999, 'RJ'],
    [29000000, 29999999, 'ES'],
    [30000000, 39999999, 'MG'],
    [40000000, 48999999, 'BA'],
    [49000000, 49999999, 'SE'],
    [50000000, 56999999, 'PE'],
    [57000000, 57999999, 'AL'],
    [58000000, 58999999, 'PB'],
    [59000000, 59999999, 'RN'],
    [60000000, 63999999, 'CE'],
    [64000000, 64999999, 'PI'],
    [65000000, 65999999, 'MA'],
    [66000000, 68899999, 'PA'],
    [68900000, 68999999, 'AP'],
    [69000000, 69299999, 'AM'],
    [69300000, 69399999, 'RR'],
    [69400000, 69899999, 'AM'],
    [69900000, 69999999, 'AC'],
    [70000000, 72799999, 'DF'],
    [72800000, 76799999, 'GO'],
    [76800000, 76999999, 'RO'],
    [77000000, 77999999, 'TO'],
    [78000000, 78899999, 'MT'],
    [79000000, 79999999, 'MS'],
    [80000000, 87999999, 'PR'],
    [88000000, 89999999, 'SC'],
    [90000000, 99999999, 'RS'],
];

function cepToState(cep: string): string | null {
    const num = parseInt(cep.replace(/\D/g, ''), 10);
    for (const [start, end, state] of CEP_STATE_MAP) {
        if (num >= start && num <= end) return state;
    }
    return null;
}

function isCapitalCep(cep: string, state: string): boolean {
    const num = parseInt(cep.replace(/\D/g, ''), 10);
    const capitalRanges: Record<string, [number, number]> = {
        SP: [1000000, 8999999], RJ: [20000000, 23999999], MG: [30000000, 31999999],
        PR: [80000000, 82999999], RS: [90000000, 91999999], SC: [88000000, 88999999],
        BA: [40000000, 41999999], CE: [60000000, 61999999], PE: [50000000, 52999999],
    };
    const range = capitalRanges[state];
    if (!range) return false;
    return num >= range[0] && num <= range[1];
}

// ─── Adapter ────────────────────────────────────────────────────────────────

export class TableDrivenAdapter implements CarrierAdapter {
    id: string;
    name: string;
    private carrierName: string;
    private tenantId: string;

    constructor(carrierName: string, tenantId: string) {
        this.carrierName = carrierName;
        this.tenantId = tenantId;
        this.id = `tabela_${carrierName.toLowerCase()}`;
        this.name = carrierName;
    }

    async getQuotes(input: QuoteInput): Promise<NormalizedQuote[]> {
        try {
            const breakdown = await this.calculateFreight(input);
            if (!breakdown) return [];

            return [{
                carrierCode: this.id,
                serviceCode: `${this.carrierName.toLowerCase()}_standard`,
                serviceName: `${this.carrierName} — Standard`,
                price: breakdown.totalFreight,
                estimatedDeliveryDays: breakdown.deliveryDays,
                trackingProvided: false,
                priorityScore: 0,
            }];
        } catch (err) {
            logger.warn(`table_driven_adapter: ${this.carrierName} quote failed`, {
                error: (err as Error).message,
            });
            return [];
        }
    }

    async checkHealth() {
        return { status: 'healthy' as const, latencyMs: 0, lastCheckedAt: new Date() };
    }

    // ─── Core calculation ───────────────────────────────────────────

    async calculateFreight(input: QuoteInput): Promise<FreightBreakdown | null> {
        const db = await getDb();
        const state = cepToState(input.destinationCep);
        if (!state) {
            logger.debug(`table_driven: no state for CEP ${input.destinationCep}`);
            return null;
        }

        // 1. Load carrier policy
        const policies = await db.select().from(carrierPolicies).where(and(
            eq(carrierPolicies.tenantId, this.tenantId),
            eq(carrierPolicies.carrierName, this.carrierName),
            eq(carrierPolicies.isActive, true),
        )).limit(1);

        if (policies.length === 0) return null;
        const policy = policies[0];

        // 2. Resolve zone
        const zone = await this.resolveZone(db, state, input.destinationCep);
        if (!zone) {
            logger.debug(`table_driven: no zone for ${this.carrierName}/${state}`);
            return null;
        }

        // 3. Compute charged weight
        const cubageFactor = parseFloat(String(policy.cubageFactor)) || 300;
        const realWeight = input.weightInKg;
        const cubedWeight = this.computeCubedWeight(input, cubageFactor);
        const chargedWeight = Math.max(realWeight, cubedWeight);

        // 4. Find rate band
        const rateRows = await db.select().from(carrierRateRows).where(and(
            eq(carrierRateRows.tenantId, this.tenantId),
            eq(carrierRateRows.carrierName, this.carrierName),
            eq(carrierRateRows.zoneCode, zone.zoneCode),
            eq(carrierRateRows.isActive, true),
            gte(carrierRateRows.weightBandMax, String(chargedWeight)),
        )).orderBy(asc(carrierRateRows.weightBandMax)).limit(1);

        if (rateRows.length === 0) {
            logger.debug(`table_driven: no rate band for ${this.carrierName}/${zone.zoneCode}/${chargedWeight}kg`);
            return null;
        }
        const rate = rateRows[0];

        // 5. Calculate fees
        const basePrice = n(rate.basePrice);
        const weightBand = n(rate.weightBandMax);
        const excessThreshold = n(policy.weightThresholdExcess) || weightBand;

        // Excess kg: if weight exceeds band, charge per excess kg
        let excessKgCharge = 0;
        if (chargedWeight > weightBand && n(rate.excessKgPrice) > 0) {
            excessKgCharge = (chargedWeight - weightBand) * n(rate.excessKgPrice);
        }

        // Invoice value estimate (for ADV/GRIS/FV) — use insurance value or estimate
        const invoiceValue = input.insuranceValue || basePrice * 3;

        // ADV (Ad Valorem)
        const advCharge = Math.max(invoiceValue * n(rate.advPercent), n(rate.advMin));
        // GRIS (Gerenciamento de Risco)
        const grisCharge = Math.max(invoiceValue * n(rate.grisPercent), n(rate.grisMin));
        // TAS (Taxa de Administração do Seguro)
        const tasCharge = n(rate.tasValue);
        // TRT (Taxa de Restrição de Trânsito)
        const trtCharge = Math.max(invoiceValue * n(rate.trtPercent), n(rate.trtMin));
        // Pedágio
        const pedagioFrac = n(rate.pedagioFractionKg) || 100;
        const pedagioCharge = Math.ceil(chargedWeight / pedagioFrac) * n(rate.pedagioValue);
        // EMEX
        const emexCharge = n(rate.emexValue) + invoiceValue * n(rate.emexPercent);
        // TXA
        const txaCharge = n(rate.txaValue);
        // FPK
        const fpkCharge = n(rate.fpkValue);
        // FV (Frete Valor)
        const fvCharge = invoiceValue * n(rate.fvPercent);

        const totalFreight = basePrice + excessKgCharge + advCharge + grisCharge
            + tasCharge + trtCharge + pedagioCharge + emexCharge + txaCharge + fpkCharge + fvCharge;

        const deliveryDays = rate.deliveryTimeDays || policy.deliveryTimeDaysBase;

        logger.info('table_driven: freight calculated', {
            carrier: this.carrierName, zone: zone.zoneCode,
            realWeight, cubedWeight: Math.round(cubedWeight * 100) / 100,
            chargedWeight, band: weightBand,
            base: basePrice, total: Math.round(totalFreight * 100) / 100,
            days: deliveryDays,
        });

        return {
            carrierName: this.carrierName,
            zoneCode: zone.zoneCode,
            realWeightKg: realWeight,
            cubedWeightKg: Math.round(cubedWeight * 100) / 100,
            chargedWeightKg: chargedWeight,
            weightBand,
            basePrice,
            excessKgCharge: round2(excessKgCharge),
            advCharge: round2(advCharge),
            grisCharge: round2(grisCharge),
            tasCharge: round2(tasCharge),
            trtCharge: round2(trtCharge),
            pedagioCharge: round2(pedagioCharge),
            emexCharge: round2(emexCharge),
            txaCharge: round2(txaCharge),
            fpkCharge: round2(fpkCharge),
            fvCharge: round2(fvCharge),
            totalFreight: round2(totalFreight),
            deliveryDays,
        };
    }

    private async resolveZone(db: any, state: string, cep: string) {
        const cepNum = cep.replace(/\D/g, '').padEnd(8, '0');

        // Try CEP range match first
        const zones = await db.select().from(carrierZones).where(and(
            eq(carrierZones.tenantId, this.tenantId),
            eq(carrierZones.carrierName, this.carrierName),
            eq(carrierZones.state, state),
            eq(carrierZones.isActive, true),
        ));

        if (zones.length === 0) return null;
        if (zones.length === 1) return zones[0];

        // Multiple zones for same state (e.g., SP_CAP vs SP_INT)
        // Check CEP ranges
        for (const z of zones) {
            if (z.cepRangeStart && z.cepRangeEnd) {
                if (cepNum >= z.cepRangeStart && cepNum <= z.cepRangeEnd) return z;
            }
        }

        // Fallback: check capital/interior
        const isCap = isCapitalCep(cep, state);
        const capZone = zones.find((z: any) => z.capitalOrInterior === 'CAPITAL');
        const intZone = zones.find((z: any) => z.capitalOrInterior === 'INTERIOR');
        if (isCap && capZone) return capZone;
        if (!isCap && intZone) return intZone;

        // Default to first
        return zones[0];
    }

    private computeCubedWeight(input: QuoteInput, cubageFactor: number): number {
        const w = input.widthCm || 0;
        const h = input.heightCm || 0;
        const l = input.lengthCm || 0;
        if (w === 0 || h === 0 || l === 0) return 0;
        // Cubed weight = (W × H × L) / cubage factor (in cm³ to kg)
        // cubageFactor is in kg/m³ → divide by 1,000,000 to convert cm³
        return (w * h * l) / (1000000 / cubageFactor);
    }
}

function n(val: any): number {
    if (val == null) return 0;
    const num = parseFloat(String(val));
    return isNaN(num) ? 0 : num;
}

function round2(val: number): number {
    return Math.round(val * 100) / 100;
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Get all active table-driven adapters for a tenant,
 * filtered by carrier priority for the destination region.
 */
export async function getTableAdaptersForDestination(
    tenantId: string,
    destinationCep: string,
): Promise<TableDrivenAdapter[]> {
    const state = cepToState(destinationCep);
    if (!state) return [];

    const db = await getDb();
    const policies = await db.select().from(carrierPolicies).where(and(
        eq(carrierPolicies.tenantId, tenantId),
        eq(carrierPolicies.isActive, true),
    ));

    // Filter carriers that have zones covering this state
    const adapters: TableDrivenAdapter[] = [];
    for (const policy of policies) {
        const zones = await db.select().from(carrierZones).where(and(
            eq(carrierZones.tenantId, tenantId),
            eq(carrierZones.carrierName, policy.carrierName),
            eq(carrierZones.state, state),
            eq(carrierZones.isActive, true),
        )).limit(1);

        if (zones.length > 0) {
            adapters.push(new TableDrivenAdapter(policy.carrierName, tenantId));
        }
    }

    return adapters;
}
