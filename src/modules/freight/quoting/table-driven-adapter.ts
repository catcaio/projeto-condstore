/**
 * Table-Driven Carrier Adapter.
 * Replaces the flat CSV lookup with a DB-driven multi-carrier engine.
 * Supports zone resolution, cubed weight, and full fee composition.
 */

import { getDb } from '@/infra/db';
import { carrierPolicies, carrierZones, carrierRateRows } from '@/drizzle/schema';
import { eq, and, gte, asc } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import type { CarrierAdapter, QuoteInput, NormalizedQuote } from '@/modules/shipping/carriers/types';
import { extractStateFromCep, resolveCarrierZone } from '@/core/freight/zone-resolver';

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
        const state = extractStateFromCep(input.destinationCep);
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
        const zoneCode = await resolveCarrierZone({
            tenantId: this.tenantId,
            carrierName: this.carrierName,
            cep: input.destinationCep
        });

        if (!zoneCode) {
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
            eq(carrierRateRows.zoneCode, zoneCode),
            eq(carrierRateRows.isActive, true),
            gte(carrierRateRows.weightBandMax, String(chargedWeight)),
        )).orderBy(asc(carrierRateRows.weightBandMax)).limit(1);

        if (rateRows.length === 0) {
            logger.debug(`table_driven: no rate band for ${this.carrierName}/${zoneCode}/${chargedWeight}kg`);
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
            carrier: this.carrierName, zone: zoneCode,
            realWeight, cubedWeight: Math.round(cubedWeight * 100) / 100,
            chargedWeight, band: weightBand,
            base: basePrice, total: Math.round(totalFreight * 100) / 100,
            days: deliveryDays,
        });

        return {
            carrierName: this.carrierName,
            zoneCode,
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
    const state = extractStateFromCep(destinationCep);
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
