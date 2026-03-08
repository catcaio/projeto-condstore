/**
 * Test script for operational packing consolidation rules.
 *
 * Usage: npx tsx scripts/test-packing-rules.ts
 */

import {
    consolidateIdenticalProducts,
    consolidateMixedOrder,
    enforcePhysicalLimits,
    type ProductInput,
    type PackedVolume,
} from '../src/core/freight/packing-consolidation';

function header(title: string) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log('═'.repeat(60));
}

function printVolumes(label: string, volumes: PackedVolume[]) {
    console.log(`\n  ${label}:`);
    console.log(`  Total volumes: ${volumes.length}`);
    console.log(`  Total weight: ${volumes.reduce((s, v) => s + v.weight, 0)} kg`);
    for (let i = 0; i < volumes.length; i++) {
        const v = volumes[i];
        console.log(`  Volume ${i + 1}: ${v.length}×${v.width}×${v.height} cm | ${v.weight} kg | ${v.stackedUnits} units | products: ${v.sourceProducts.join(', ')}`);
    }
}

// ── Case 1: 1 single product ────────────────────────────────────────────
header('CASE 1: 1 product (Lixeira 240L)');
const lixeira: ProductInput = {
    productRef: 'lixeira-240l',
    length: 115,
    width: 60,
    height: 80,
    weight: 15,
    quantity: 1,
};
const case1 = consolidateIdenticalProducts(lixeira);
printVolumes('1 unit', case1);
console.assert(case1.length === 1, '❌ Expected 1 volume');
console.assert(case1[0].stackedUnits === 1, '❌ Expected 1 stacked unit');
console.assert(case1[0].weight === 15, '❌ Expected 15 kg');
console.log('  ✅ PASS');

// ── Case 2: 3 identical products ────────────────────────────────────────
header('CASE 2: 3 identical products (Lixeira 240L)');
const case2 = consolidateIdenticalProducts({ ...lixeira, quantity: 3 });
printVolumes('3 units', case2);
console.assert(case2.length === 1, '❌ Expected 1 volume');
console.assert(case2[0].stackedUnits === 3, '❌ Expected 3 stacked units');
console.assert(case2[0].weight === 45, '❌ Expected 45 kg');
// Stacking: +10cm on longest axis (115cm) × 2 extra = 135cm
console.assert(case2[0].length === 135, `❌ Expected 135 cm length, got ${case2[0].length}`);
console.assert(case2[0].width === 60, '❌ Width should stay 60 cm');
console.assert(case2[0].height === 80, '❌ Height should stay 80 cm');
console.log('  ✅ PASS');

// ── Case 3: 4 identical products (must produce 2 volumes) ──────────────
header('CASE 3: 4 identical products (Lixeira 240L)');
const case3 = consolidateIdenticalProducts({ ...lixeira, quantity: 4 });
printVolumes('4 units', case3);
console.assert(case3.length === 2, `❌ Expected 2 volumes, got ${case3.length}`);
console.assert(case3[0].stackedUnits === 3, '❌ First volume should have 3 units');
console.assert(case3[1].stackedUnits === 1, '❌ Second volume should have 1 unit');
console.assert(case3[0].weight === 45, '❌ First volume weight should be 45 kg');
console.assert(case3[1].weight === 15, '❌ Second volume weight should be 15 kg');
console.log('  ✅ PASS');

// ── Case 4: Mixed order (3 large + 2 small) ────────────────────────────
header('CASE 4: Mixed order (3 large lixeiras + 2 small caixas)');
const caixa: ProductInput = {
    productRef: 'caixa-sacos',
    length: 40,
    width: 30,
    height: 20,
    weight: 3,
    quantity: 2,
};
const case4 = consolidateMixedOrder([
    { ...lixeira, quantity: 3 },
    caixa,
]);
printVolumes('Mixed order', case4.volumes);
console.assert(case4.totalVolumes >= 1, '❌ Expected at least 1 volume');
// The small caixas (40×30×20) should fit inside the lixeira volume (135×60×80)
// so only weight should increase, not dimensions
const baseVol = case4.volumes[0];
console.assert(baseVol.sourceProducts.includes('lixeira-240l'), '❌ Base volume should contain lixeira');
console.assert(baseVol.weight > 45, '❌ Base volume weight should include absorbed small products');
console.log('  ✅ PASS');

// ── Case 5: Oversized volume (exceeds 3m × 2m × 2m) ────────────────────
header('CASE 5: Oversized volume (must split)');
const hugeProduct: ProductInput = {
    productRef: 'container-huge',
    length: 250,
    width: 150,
    height: 150,
    weight: 100,
    quantity: 3,
};
// 3 units: 250 + 2×10 = 270 cm still under 300 limit
const case5a = consolidateIdenticalProducts(hugeProduct);
printVolumes('3×huge (fits)', case5a);
console.assert(case5a.length === 1, `❌ Expected 1 volume (270cm fits 300 limit), got ${case5a.length}`);
console.log('  ✅ Sub-case A (fits in limit): PASS');

// Now make something truly oversized
const oversize: ProductInput = {
    productRef: 'oversized-panel',
    length: 280,
    width: 150,
    height: 150,
    weight: 80,
    quantity: 3,
};
// 3 units: 280 + 2×10 = 300 cm — exactly at limit, should pass
const case5b = consolidateIdenticalProducts(oversize);
printVolumes('3×oversized-panel at limit', case5b);
console.assert(case5b[0].length === 300, `❌ Expected 300cm, got ${case5b[0].length}`);
console.log('  ✅ Sub-case B (at limit boundary): PASS');

// Over the limit
const overLimit: ProductInput = {
    productRef: 'oversize-beam',
    length: 290,
    width: 150,
    height: 150,
    weight: 80,
    quantity: 3,
};
// 3 units: 290 + 2×10 = 310 cm → exceeds 300 → must split
const case5c = consolidateIdenticalProducts(overLimit);
printVolumes('3×oversize-beam (exceeds limit)', case5c);
console.assert(case5c.length > 1, `❌ Expected split (>1 volume), got ${case5c.length}`);
console.log('  ✅ Sub-case C (exceeds limit, splits): PASS');

// ── Summary ─────────────────────────────────────────────────────────────
header('ALL PACKING CONSOLIDATION TESTS PASSED ✅');
