import * as fs from 'fs';
import * as path from 'path';

function parseBrMoney(val: any): number {
    if (!val) return 0;
    let s = String(val).replace('R$', '').replace('FP =', '').replace('FPK =', '').replace('FV =', '').replace('%', '').trim();
    // Remove all spaces inside the number (like "8 5,00" -> "85,00")
    s = s.replace(/\s+/g, '');
    s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

const rawData = JSON.parse(fs.readFileSync('raw_tables.json', 'utf-8'));
const policies: any[] = [];
const zones: any[] = [];
const rateRows: any[] = [];

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ---------------------------
// 1. MENGUE NORMALIZATION
// ---------------------------

policies.push({
    id: generateUUID(),
    carrierName: 'MENGUE',
    originCity: 'PALHOÇA',
    originState: 'SC',
    cubageFactor: 300,
    grisPercent: 0.0035,
    grisMin: 2.50,
    advPercent: 0.0050,
    advMin: 3.50,
    trtPercent: 0,
    trtMin: 0,
    pedagioValue: 4.00, // Demais estados: R$ 4,00, SP/MG: 6,90, handled below
    emexValue: 0
});

// Based on Mengue Headers:
const mengueBands = [10, 30, 50, 70, 100];
let currentMengueState = '';
let mengueZoneCounter = 1;

for (const row of rawData.mengue) {
    if (!row || !Array.isArray(row)) continue;
    // Look for rows that have rates in the 4th column onwards
    const str = String(row[3] || '');
    if (str.includes('R$') && row.length >= 9) {
        const state = row[1] ? row[1].trim() : currentMengueState;
        if (state && state !== '--') currentMengueState = state;

        let desc = String(row[2] || '').trim();
        const zoneCode = `MENGUE_${currentMengueState}_${mengueZoneCounter++}`;

        zones.push({
            id: generateUUID(),
            carrierName: 'MENGUE',
            zoneCode: zoneCode,
            state: currentMengueState,
            regionName: desc,
            capitalOrInterior: desc.includes('Interior') ? 'INTERIOR' : 'CAPITAL',
        });

        let pedagioValue = 4.00;
        if (currentMengueState === 'SP' || currentMengueState === 'MG') {
            pedagioValue = 6.90;
        }

        // Map bands
        const prices = [
            parseBrMoney(row[3]),
            parseBrMoney(row[4]),
            parseBrMoney(row[5]),
            parseBrMoney(row[6]),
            parseBrMoney(row[7])
        ];

        const excess = parseBrMoney(row[8]);

        for (let i = 0; i < mengueBands.length; i++) {
            rateRows.push({
                id: generateUUID(),
                carrierName: 'MENGUE',
                zoneCode: zoneCode,
                weightBandMax: mengueBands[i],
                basePrice: prices[i],
                excessKgPrice: i === mengueBands.length - 1 ? excess : 0,
                advPercent: 0.0050,
                advMin: 3.50,
                grisPercent: 0.0035,
                grisMin: 2.50,
                pedagioValue: pedagioValue,
                pedagioFractionKg: 100,
            });
        }
    }
}

// ---------------------------
// 2. BRASPRESS NORMALIZATION
// ---------------------------

policies.push({
    id: generateUUID(),
    carrierName: 'BRASPRESS',
    originCity: 'PALHOÇA',
    originState: 'SC',
    cubageFactor: 300,
    grisPercent: 0,
    grisMin: 0,
    advPercent: 0,
    advMin: 0,
    pedagioValue: 0
});

// Bands for Braspress (e.g., Até 10Kg, 20Kg, 35Kg, 50Kg, 70Kg, Acima 70Kg)
const braspressBands = [10, 20, 35, 50, 70, 9999];
let braspressZoneCounter = 1;

for (let i = 0; i < rawData.braspress.length; i++) {
    const row = rawData.braspress[i];
    if (!row || !Array.isArray(row)) continue;

    // Pattern: 'SAO PAULO E REG.', '', '', '', '', 'FP = 68,72', ...
    const nameCol = String(row[0] || '').trim();
    if (nameCol && row[5] && String(row[5]).includes('FP =')) {
        const zoneCode = `BRASPRESS_ZONE_${braspressZoneCounter++}`;
        zones.push({
            id: generateUUID(),
            carrierName: 'BRASPRESS',
            zoneCode: zoneCode,
            state: 'ND',
            regionName: nameCol,
            capitalOrInterior: 'ND'
        });

        const prices = [
            parseBrMoney(row[5]),
            parseBrMoney(row[6]),
            parseBrMoney(row[7]),
            parseBrMoney(row[8]),
            parseBrMoney(row[9]),
        ];
        const excess = parseBrMoney(row[10]); // FPK

        for (let b = 0; b < braspressBands.length; b++) {
            rateRows.push({
                id: generateUUID(),
                carrierName: 'BRASPRESS',
                zoneCode: zoneCode,
                weightBandMax: braspressBands[b],
                basePrice: b < prices.length ? prices[b] : (prices[prices.length - 1] || 0),
                excessKgPrice: b === braspressBands.length - 1 ? excess : 0
            });
        }
    }
}

// ---------------------------
// 3. MOVVI NORMALIZATION
// ---------------------------

policies.push({
    id: generateUUID(),
    carrierName: 'MOVVI',
    originCity: 'FLORIANOPÓLIS',
    originState: 'SC',
    cubageFactor: 300,
    grisPercent: 0.00137, // extracted from row[32] = 0.0013700000000000001
    grisMin: 10.54,       // from row[33]
    advPercent: 0.00272,  // mapped from 'FRETE VLR (%)' row[28] initially or row[29]? Wait, MOVVI has specific ones per row. Let's handle row level fees fully.
});

const movviBands = [10, 20, 30, 50, 70, 100];
const targetState = 'SP'; // Many in the provided table are SP and others
let isTableSection = false;

for (const row of rawData.movvi) {
    if (!row || !Array.isArray(row)) continue;

    if (String(row[1]).includes('BUSCA')) {
        isTableSection = true;
        continue;
    }

    if (isTableSection && String(row[1]).startsWith('FLN/')) {
        // [null,"FLN/SAO","FLORIANOPÓLIS","SÃO PAULO","SUDESTE","CAPITAL",40.65,47.97,53.71,62.85,77.31,95.09,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.95,0.00272,0,0,0,0.00137,10.54,3.74,0.0968,14.52,10.2,0,0]

        const dest = String(row[3]);
        const stateReg = String(row[4]);
        const ci = String(row[5]); // CAPITAL / INTERIOR

        const zoneCode = String(row[1]).replace('/', '_');
        zones.push({
            id: generateUUID(),
            carrierName: 'MOVVI',
            zoneCode: zoneCode,
            state: dest.includes('SP') ? 'SP' : (dest.includes('RIO') ? 'RJ' : 'ND'), // basic map
            regionName: dest,
            capitalOrInterior: ci
        });

        const prices = [
            parseFloat(row[6]) || 0,
            parseFloat(row[7]) || 0,
            parseFloat(row[8]) || 0,
            parseFloat(row[9]) || 0,
            parseFloat(row[10]) || 0,
            parseFloat(row[11]) || 0,
        ];
        const excess = parseFloat(row[27]) || 0; // .> 100
        const advPercent = parseFloat(row[28]) || 0;
        const advMin = parseFloat(row[29]) || 0;
        const grisPercent = parseFloat(row[32]) || 0;
        const grisMin = parseFloat(row[33]) || 0;
        const tasValue = parseFloat(row[34]) || 0;
        const trtPercent = parseFloat(row[35]) || 0;
        const trtMin = parseFloat(row[36]) || 0;
        const pedagioValue = parseFloat(row[37]) || 0;

        for (let i = 0; i < movviBands.length; i++) {
            rateRows.push({
                id: generateUUID(),
                carrierName: 'MOVVI',
                zoneCode: zoneCode,
                weightBandMax: movviBands[i],
                basePrice: prices[i] || 0,
                excessKgPrice: 0,
                advPercent, advMin,
                grisPercent, grisMin,
                tasValue, trtPercent, trtMin,
                pedagioValue, pedagioFractionKg: 100
            });
        }
        // Add final > 100 band
        rateRows.push({
            id: generateUUID(),
            carrierName: 'MOVVI',
            zoneCode: zoneCode,
            weightBandMax: 9999,
            basePrice: prices[prices.length - 1] || 0,
            excessKgPrice: excess,
            advPercent, advMin,
            grisPercent, grisMin,
            tasValue, trtPercent, trtMin,
            pedagioValue, pedagioFractionKg: 100
        });
    }
}

// ---------------------------
// OUTPUT FILES
// ---------------------------

const outJson = { policies, zones, rateRows };
fs.writeFileSync('normalized-carriers.json', JSON.stringify(outJson, null, 2), 'utf-8');
console.log('Saved normalized-carriers.json');

// Generate SQL Scripts
let sql = '';
sql += `-- Carrier Policies\n`;
for (const p of policies) {
    const vals = [
        `'${p.id}'`, `'tenant1'`, `'${p.carrierName}'`, `'${p.originCity || ''}'`, `'${p.originState || ''}'`,
        p.cubageFactor || 'NULL'
    ];
    sql += `INSERT IGNORE INTO carrier_policies (id, tenant_id, carrier_name, origin_city, origin_state, cubage_factor) VALUES (${vals.join(', ')});\n`;
}

sql += `\n-- Carrier Zones\n`;
for (const z of zones) {
    const vals = [
        `'${z.id}'`, `'tenant1'`, `'${z.carrierName}'`, `'${z.zoneCode}'`,
        `'${z.regionName}'`, `'${z.state || ''}'`, `'${z.capitalOrInterior}'`
    ];
    sql += `INSERT IGNORE INTO carrier_zones (id, tenant_id, carrier_name, zone_code, region_name, state, capital_or_interior) VALUES (${vals.join(', ')});\n`;
}

sql += `\n-- Carrier Rate Rows\n`;
for (const r of rateRows) {
    const vals = [
        `'${r.id}'`, `'tenant1'`, `'${r.carrierName}'`, `'${r.zoneCode}'`,
        r.weightBandMax, r.basePrice, r.excessKgPrice || 'NULL',
        r.advPercent || 'NULL', r.advMin || 'NULL',
        r.grisPercent || 'NULL', r.grisMin || 'NULL',
        r.tasValue || 'NULL', r.trtPercent || 'NULL', r.trtMin || 'NULL',
        r.pedagioValue || 'NULL', r.pedagioFractionKg || 'NULL',
        r.emexValue || 'NULL', r.emexPercent || 'NULL'
    ];
    sql += `INSERT IGNORE INTO carrier_rate_rows (id, tenant_id, carrier_name, zone_code, weight_band_max, base_price, excess_kg_price, adv_percent, adv_min, gris_percent, gris_min, tas_value, trt_percent, trt_min, pedagio_value, pedagio_fraction_kg, emex_value, emex_percent) VALUES (${vals.join(', ')});\n`;
}

fs.writeFileSync('scripts/carrier_tables.sql', sql, 'utf-8');
console.log('Saved scripts/carrier_tables.sql');
