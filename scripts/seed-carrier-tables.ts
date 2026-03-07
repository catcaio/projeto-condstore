/**
 * Seed carrier tables with representative rate data for Movvi, Mengue, Braspress.
 * Usage: npx tsx scripts/seed-carrier-tables.ts
 */
import { getDb } from '../src/infra/db';
import { carrierPolicies, carrierZones, carrierRateRows } from '../src/drizzle/schema';
import { randomUUID } from 'crypto';

const T = 'LOJACOND';

// ─── CEP prefix ranges per state (first 5 digits) ──────────────────────────
// Source: Brazilian postal system standard ranges
const STATE_CEP_RANGES: Record<string, [string, string]> = {
    SP: ['01000', '19999'], AC: ['69900', '69999'], AL: ['57000', '57999'],
    AP: ['68900', '68999'], AM: ['69000', '69899'], BA: ['40000', '48999'],
    CE: ['60000', '63999'], DF: ['70000', '72799'], ES: ['29000', '29999'],
    GO: ['72800', '76799'], MA: ['65000', '65999'], MT: ['78000', '78899'],
    MS: ['79000', '79999'], MG: ['30000', '39999'], PA: ['66000', '68899'],
    PB: ['58000', '58999'], PR: ['80000', '87999'], PE: ['50000', '56999'],
    PI: ['64000', '64999'], RJ: ['20000', '28999'], RN: ['59000', '59999'],
    RS: ['90000', '99999'], RO: ['76800', '76999'], RR: ['69300', '69399'],
    SC: ['88000', '89999'], SE: ['49000', '49999'], TO: ['77000', '77999'],
};

// Capital CEP ranges (first 3 digits)
const CAPITAL_CEP_PREFIXES: Record<string, [string, string]> = {
    SP: ['010', '089'], RJ: ['200', '239'], MG: ['300', '319'],
    PR: ['800', '829'], RS: ['900', '919'], SC: ['880', '889'],
};

// ─── Policies ───────────────────────────────────────────────────────────────

const POLICIES = [
    { carrier: 'MOVVI', originCity: 'Curitiba', originState: 'PR', cubageFactor: '300.00', weightThreshold: '300.00', deliveryBase: 5, notes: 'Movvi Transportes — Sul/Sudeste' },
    { carrier: 'MENGUE', originCity: 'Curitiba', originState: 'PR', cubageFactor: '300.00', weightThreshold: '300.00', deliveryBase: 5, notes: 'Mengue Transportes — Sul/Sudeste' },
    { carrier: 'BRASPRESS', originCity: 'Curitiba', originState: 'PR', cubageFactor: '300.00', weightThreshold: '500.00', deliveryBase: 8, notes: 'Braspress — Nacional' },
];

// ─── Zones ──────────────────────────────────────────────────────────────────

interface ZoneDef {
    carrier: string; code: string; region: string; capInt: string;
    state: string; cepStart: string; cepEnd: string;
}

function makeZones(): ZoneDef[] {
    const zones: ZoneDef[] = [];

    // Movvi & Mengue: Sul/Sudeste zones
    for (const carrier of ['MOVVI', 'MENGUE']) {
        // SC
        zones.push({ carrier, code: 'SC', region: 'Santa Catarina', capInt: 'BOTH', state: 'SC', cepStart: '88000000', cepEnd: '89999999' });
        // PR
        zones.push({ carrier, code: 'PR', region: 'Paraná', capInt: 'BOTH', state: 'PR', cepStart: '80000000', cepEnd: '87999999' });
        // RS
        zones.push({ carrier, code: 'RS', region: 'Rio Grande do Sul', capInt: 'BOTH', state: 'RS', cepStart: '90000000', cepEnd: '99999999' });
        // SP Capital
        zones.push({ carrier, code: 'SP_CAP', region: 'São Paulo Capital', capInt: 'CAPITAL', state: 'SP', cepStart: '01000000', cepEnd: '08999999' });
        // SP Interior
        zones.push({ carrier, code: 'SP_INT', region: 'São Paulo Interior', capInt: 'INTERIOR', state: 'SP', cepStart: '09000000', cepEnd: '19999999' });
        // MG
        zones.push({ carrier, code: 'MG', region: 'Minas Gerais', capInt: 'BOTH', state: 'MG', cepStart: '30000000', cepEnd: '39999999' });
        // RJ
        zones.push({ carrier, code: 'RJ', region: 'Rio de Janeiro', capInt: 'BOTH', state: 'RJ', cepStart: '20000000', cepEnd: '28999999' });
    }

    // Braspress: Nacional zones
    // Sul
    for (const st of ['SC', 'PR', 'RS']) {
        const r = STATE_CEP_RANGES[st];
        zones.push({ carrier: 'BRASPRESS', code: `SUL_${st}`, region: `Sul — ${st}`, capInt: 'BOTH', state: st, cepStart: `${r[0]}000`, cepEnd: `${r[1]}999` });
    }
    // Sudeste
    for (const st of ['SP', 'MG', 'RJ', 'ES']) {
        const r = STATE_CEP_RANGES[st];
        zones.push({ carrier: 'BRASPRESS', code: `SE_${st}`, region: `Sudeste — ${st}`, capInt: 'BOTH', state: st, cepStart: `${r[0]}000`, cepEnd: `${r[1]}999` });
    }
    // Centro-Oeste
    for (const st of ['GO', 'DF', 'MT', 'MS']) {
        const r = STATE_CEP_RANGES[st];
        zones.push({ carrier: 'BRASPRESS', code: `CO_${st}`, region: `Centro-Oeste — ${st}`, capInt: 'BOTH', state: st, cepStart: `${r[0]}000`, cepEnd: `${r[1]}999` });
    }
    // Nordeste
    for (const st of ['BA', 'CE', 'PE', 'MA', 'PB', 'RN', 'AL', 'SE', 'PI']) {
        const r = STATE_CEP_RANGES[st];
        zones.push({ carrier: 'BRASPRESS', code: `NE_${st}`, region: `Nordeste — ${st}`, capInt: 'BOTH', state: st, cepStart: `${r[0]}000`, cepEnd: `${r[1]}999` });
    }
    // Norte
    for (const st of ['AM', 'PA', 'RO', 'AC', 'AP', 'RR', 'TO']) {
        const r = STATE_CEP_RANGES[st];
        zones.push({ carrier: 'BRASPRESS', code: `N_${st}`, region: `Norte — ${st}`, capInt: 'BOTH', state: st, cepStart: `${r[0]}000`, cepEnd: `${r[1]}999` });
    }

    return zones;
}

// ─── Rate rows ──────────────────────────────────────────────────────────────

interface RateSpec {
    carrier: string; zone: string; weightMax: number; basePrice: number;
    excessKg: number | null; advPct: number | null; advMin: number | null;
    grisPct: number | null; grisMin: number | null; tas: number | null;
    trtPct: number | null; trtMin: number | null;
    pedagio: number | null; pedagioFracKg: number | null;
    emex: number | null; emexPct: number | null;
    txa: number | null; fpk: number | null; fvPct: number | null;
    deliveryDays: number;
}

function makeRates(): RateSpec[] {
    const rates: RateSpec[] = [];

    // Weight bands for Movvi/Mengue (Sul/Sudeste carriers)
    const WEIGHT_BANDS = [10, 20, 30, 50, 100, 150, 200, 300];

    // Base price multipliers per zone (relative to PR which is cheapest)
    const MOVVI_ZONE_MULT: Record<string, [number, number]> = { // [multiplier, deliveryDays]
        PR: [1.0, 3], SC: [1.05, 4], RS: [1.10, 4],
        SP_CAP: [1.25, 5], SP_INT: [1.35, 6], MG: [1.40, 7], RJ: [1.45, 7],
    };
    const MENGUE_ZONE_MULT: Record<string, [number, number]> = {
        PR: [1.0, 3], SC: [1.08, 4], RS: [1.12, 4],
        SP_CAP: [1.30, 5], SP_INT: [1.40, 6], MG: [1.45, 7], RJ: [1.50, 7],
    };

    // Movvi base prices per weight band (for PR zone)
    const MOVVI_BASE_PR = [38, 52, 68, 95, 160, 220, 285, 410];
    // Mengue base prices per weight band (for PR zone, slightly different)
    const MENGUE_BASE_PR = [42, 56, 72, 98, 165, 225, 290, 420];

    for (const [zi, zone] of Object.keys(MOVVI_ZONE_MULT).entries()) {
        const [mult, days] = MOVVI_ZONE_MULT[zone];
        for (let i = 0; i < WEIGHT_BANDS.length; i++) {
            rates.push({
                carrier: 'MOVVI', zone, weightMax: WEIGHT_BANDS[i],
                basePrice: Math.round(MOVVI_BASE_PR[i] * mult * 100) / 100,
                excessKg: 2.80, advPct: 0.003, advMin: 12,
                grisPct: 0.003, grisMin: 15, tas: 7.50,
                trtPct: null, trtMin: null,
                pedagio: 3.50, pedagioFracKg: 100,
                emex: null, emexPct: null,
                txa: 5.00, fpk: null, fvPct: null,
                deliveryDays: days,
            });
        }
    }

    for (const [zi, zone] of Object.keys(MENGUE_ZONE_MULT).entries()) {
        const [mult, days] = MENGUE_ZONE_MULT[zone];
        for (let i = 0; i < WEIGHT_BANDS.length; i++) {
            rates.push({
                carrier: 'MENGUE', zone, weightMax: WEIGHT_BANDS[i],
                basePrice: Math.round(MENGUE_BASE_PR[i] * mult * 100) / 100,
                excessKg: 3.00, advPct: 0.003, advMin: 15,
                grisPct: 0.003, grisMin: 18, tas: 8.00,
                trtPct: 0.005, trtMin: 25,
                pedagio: 4.00, pedagioFracKg: 100,
                emex: null, emexPct: null,
                txa: 5.00, fpk: null, fvPct: null,
                deliveryDays: days,
            });
        }
    }

    // Braspress: Nacional carrier — larger bands, higher minimums
    const BP_WEIGHT_BANDS = [20, 50, 100, 200, 300, 500];
    const BP_ZONE_MULT: Record<string, [number, number]> = {
        // Sul
        SUL_PR: [1.0, 4], SUL_SC: [1.05, 5], SUL_RS: [1.10, 5],
        // Sudeste
        SE_SP: [1.25, 6], SE_MG: [1.35, 7], SE_RJ: [1.40, 7], SE_ES: [1.50, 8],
        // Centro-Oeste
        CO_GO: [1.60, 9], CO_DF: [1.65, 9], CO_MT: [1.80, 10], CO_MS: [1.55, 8],
        // Nordeste
        NE_BA: [1.70, 10], NE_CE: [1.85, 12], NE_PE: [1.80, 11], NE_MA: [2.00, 14],
        NE_PB: [1.85, 12], NE_RN: [1.85, 12], NE_AL: [1.80, 11], NE_SE: [1.75, 10], NE_PI: [1.95, 13],
        // Norte
        N_AM: [2.20, 15], N_PA: [2.10, 14], N_RO: [2.00, 12], N_AC: [2.30, 16],
        N_AP: [2.25, 15], N_RR: [2.35, 16], N_TO: [1.85, 11],
    };
    const BP_BASE = [65, 120, 210, 380, 540, 850];

    for (const zone of Object.keys(BP_ZONE_MULT)) {
        const [mult, days] = BP_ZONE_MULT[zone];
        for (let i = 0; i < BP_WEIGHT_BANDS.length; i++) {
            rates.push({
                carrier: 'BRASPRESS', zone, weightMax: BP_WEIGHT_BANDS[i],
                basePrice: Math.round(BP_BASE[i] * mult * 100) / 100,
                excessKg: 3.50, advPct: 0.003, advMin: 20,
                grisPct: 0.004, grisMin: 25, tas: 10.00,
                trtPct: 0.006, trtMin: 30,
                pedagio: 5.00, pedagioFracKg: 100,
                emex: 8.00, emexPct: null,
                txa: 6.00, fpk: 4.00, fvPct: 0.002,
                deliveryDays: days,
            });
        }
    }

    return rates;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║ CARRIER TABLES — SEED DATA                    ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    const db = await getDb();

    // ── Policies ──
    console.log('[1/3] Inserting carrier policies...');
    for (const p of POLICIES) {
        await db.insert(carrierPolicies).values({
            id: randomUUID(), tenantId: T, carrierName: p.carrier,
            originCity: p.originCity, originState: p.originState,
            cubageFactor: p.cubageFactor, weightThresholdExcess: p.weightThreshold,
            deliveryTimeDaysBase: p.deliveryBase, notes: p.notes, isActive: true,
        });
        console.log(`  ✅ ${p.carrier}`);
    }

    // ── Zones ──
    const zones = makeZones();
    console.log(`\n[2/3] Inserting ${zones.length} carrier zones...`);
    for (const z of zones) {
        await db.insert(carrierZones).values({
            id: randomUUID(), tenantId: T, carrierName: z.carrier,
            zoneCode: z.code, regionName: z.region,
            capitalOrInterior: z.capInt, state: z.state,
            cepRangeStart: z.cepStart, cepRangeEnd: z.cepEnd,
            isActive: true,
        });
    }
    const carrierZoneCounts = new Map<string, number>();
    zones.forEach(z => carrierZoneCounts.set(z.carrier, (carrierZoneCounts.get(z.carrier) || 0) + 1));
    carrierZoneCounts.forEach((count, carrier) => console.log(`  ✅ ${carrier}: ${count} zones`));

    // ── Rate Rows ──
    const rates = makeRates();
    console.log(`\n[3/3] Inserting ${rates.length} carrier rate rows...`);
    for (const r of rates) {
        await db.insert(carrierRateRows).values({
            id: randomUUID(), tenantId: T, carrierName: r.carrier,
            zoneCode: r.zone, weightBandMax: String(r.weightMax),
            basePrice: String(r.basePrice),
            excessKgPrice: r.excessKg != null ? String(r.excessKg) : null,
            advPercent: r.advPct != null ? String(r.advPct) : null,
            advMin: r.advMin != null ? String(r.advMin) : null,
            grisPercent: r.grisPct != null ? String(r.grisPct) : null,
            grisMin: r.grisMin != null ? String(r.grisMin) : null,
            tasValue: r.tas != null ? String(r.tas) : null,
            trtPercent: r.trtPct != null ? String(r.trtPct) : null,
            trtMin: r.trtMin != null ? String(r.trtMin) : null,
            pedagioValue: r.pedagio != null ? String(r.pedagio) : null,
            pedagioFractionKg: r.pedagioFracKg != null ? String(r.pedagioFracKg) : null,
            emexValue: r.emex != null ? String(r.emex) : null,
            emexPercent: r.emexPct != null ? String(r.emexPct) : null,
            txaValue: r.txa != null ? String(r.txa) : null,
            fpkValue: r.fpk != null ? String(r.fpk) : null,
            fvPercent: r.fvPct != null ? String(r.fvPct) : null,
            deliveryTimeDays: r.deliveryDays,
            isActive: true,
        });
    }
    const carrierRateCounts = new Map<string, number>();
    rates.forEach(r => carrierRateCounts.set(r.carrier, (carrierRateCounts.get(r.carrier) || 0) + 1));
    carrierRateCounts.forEach((count, carrier) => console.log(`  ✅ ${carrier}: ${count} rate rows`));

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`SEED COMPLETE: ${POLICIES.length} policies, ${zones.length} zones, ${rates.length} rate rows`);
    console.log('═'.repeat(50));

    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
