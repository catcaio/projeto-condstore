/**
 * Carrier Router Validation Script.
 *
 * Tests 3 routing scenarios:
 * 1. Small package ≤15kg → melhor_envio
 * 2. Large package Sul/Sudeste → table_carriers
 * 3. Large package Norte/Nordeste → braspress_api
 *
 * Usage: npx tsx scripts/validate-carrier-router.ts
 */

import { selectCarrierStrategy } from '../src/modules/freight/quoting/carrier-router';

const PASS = '✅';
const FAIL = '❌';

function test(label: string, expected: string, result: any) {
    const ok = result.strategy === expected;
    console.log(`  ${ok ? PASS : FAIL} ${label}`);
    console.log(`     Strategy: ${result.strategy} (expected: ${expected})`);
    console.log(`     Carriers: ${result.eligibleCarriers.join(', ')}`);
    console.log(`     Reason: ${result.reason}`);
    console.log();
    return ok;
}

console.log('═'.repeat(60));
console.log('  CARRIER ROUTER VALIDATION');
console.log('═'.repeat(60));
console.log();

let allPassed = true;

// Scenario 1: Small package ≤15kg → melhor_envio
console.log('  Scenario 1: Small package (10kg, 30cm) → expected: melhor_envio');
const r1 = selectCarrierStrategy({
    tenantId: 'TEST',
    originCep: '88131640',
    destinationCep: '01001000', // SP
    totalWeight: 10,
    cubedWeight: 8,
    chargedWeight: 10,
    volumes: 1,
    longestDimensionCm: 30,
});
allPassed = test('Small package', 'melhor_envio', r1) && allPassed;

// Scenario 2: Large package to SP (Sul/Sudeste) → table_carriers
console.log('  Scenario 2: Large package (80kg, 135cm) to SP → expected: table_carriers');
const r2 = selectCarrierStrategy({
    tenantId: 'TEST',
    originCep: '88131640',
    destinationCep: '01001000', // SP
    totalWeight: 80,
    cubedWeight: 200,
    chargedWeight: 200,
    volumes: 2,
    longestDimensionCm: 250,
});
allPassed = test('Large to SP', 'table_carriers', r2) && allPassed;

// Scenario 3: Large package to AM (Norte) → braspress_api
console.log('  Scenario 3: Large package (80kg, 135cm) to AM → expected: braspress_api');
const r3 = selectCarrierStrategy({
    tenantId: 'TEST',
    originCep: '88131640',
    destinationCep: '69000000', // AM (Manaus)
    totalWeight: 80,
    cubedWeight: 200,
    chargedWeight: 200,
    volumes: 2,
    longestDimensionCm: 250,
});
allPassed = test('Large to AM', 'braspress_api', r3) && allPassed;

// Bonus: edge case — exactly 15kg → melhor_envio
console.log('  Bonus: Edge case (15kg exactly) → expected: melhor_envio');
const r4 = selectCarrierStrategy({
    tenantId: 'TEST',
    originCep: '88131640',
    destinationCep: '88000000', // SC
    totalWeight: 15,
    cubedWeight: 15,
    chargedWeight: 15,
    volumes: 1,
    longestDimensionCm: 250,
});
allPassed = test('15kg edge', 'melhor_envio', r4) && allPassed;

console.log('═'.repeat(60));
console.log(`  ${allPassed ? '✅ ALL CARRIER ROUTER TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
console.log('═'.repeat(60));
process.exit(allPassed ? 0 : 1);
