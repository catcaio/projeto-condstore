/**
 * End-to-End Simulator Validation Script.
 *
 * Runs 4 freight simulation test cases through the unifiedQuoteEngine
 * and logs the exact outcomes just like the API route.
 *
 * Usage: npx tsx scripts/validate-simulator-e2e.ts
 */

import { unifiedQuoteEngine } from '../src/modules/freight/quote-engine';
import { logFreightSimulation } from '../src/modules/freight/freight-audit';
import type { FreightRequest } from '../src/modules/freight/freight.types';

const tenantId = 'LOJACOND';

const cases = [
    {
        name: 'Case A: Small package <= 15kg to SP capital',
        cep: '01001000',
        weight: 10,
        volumes: [{ length: 30, width: 30, height: 30, qty: 1 }],
        expectedStrategy: 'melhor_envio',
    },
    {
        name: 'Case B: Small package <= 15kg to SC',
        cep: '88000000',
        weight: 15,
        volumes: [{ length: 40, width: 40, height: 40, qty: 1 }],
        expectedStrategy: 'melhor_envio',
    },
    {
        name: 'Case C: Large package > 15kg to SP',
        cep: '01001000',
        weight: 50,
        volumes: [{ length: 60, width: 60, height: 60, qty: 2 }],
        expectedStrategy: 'table_carriers',
    },
    {
        name: 'Case D: Large package > 15kg to AM',
        cep: '69000000',
        weight: 50,
        volumes: [{ length: 60, width: 60, height: 60, qty: 2 }],
        expectedStrategy: 'braspress_api',
    },
];

async function run() {
    console.log('═'.repeat(60));
    console.log('  E2E SIMULATOR VALIDATION');
    console.log('═'.repeat(60));
    console.log();

    let allPassed = true;

    for (const c of cases) {
        console.log(`\n▶ ${c.name}`);
        try {
            const req: FreightRequest = {
                tenantId,
                destinationCep: c.cep,
                quantity: 1,
                unitWeight: c.weight,
                dimensions: c.volumes[0], // Simplified
                manualVolumes: c.volumes,
                manualWeight: c.weight,
            };

            const quotes = await unifiedQuoteEngine.getQuotes(req);
            const routing = unifiedQuoteEngine.lastRoutingResult;

            if (!routing) {
                console.log(`  ❌ No routing result returned from engine`);
                allPassed = false;
                continue;
            }

            const ok = routing.strategy === c.expectedStrategy;
            console.log(`  ${ok ? '✅' : '❌'} strategy_used: ${routing.strategy} (Expected: ${c.expectedStrategy})`);
            console.log(`     carriers_considered: ${routing.eligibleCarriers.join(', ')}`);
            console.log(`     router_reason: ${routing.reason}`);
            console.log(`     quotes_returned: ${quotes.length}`);

            let saved = false;
            try {
                // Mock saving the simulation using the exact logic from route.ts
                const totalVolumes = c.volumes.reduce((s, v) => s + v.qty, 0);
                const totalCubedWeight = c.volumes.reduce((s, v) => s + ((v.length * v.width * v.height * v.qty) / 6000), 0);
                const chargedWeight = Math.max(c.weight, totalCubedWeight);

                const simulationId = await logFreightSimulation({
                    tenantId,
                    cep: c.cep,
                    zoneCode: 'TEST',
                    carrierConsidered: routing.eligibleCarriers,
                    carrierSelected: quotes[0]?.carrier || undefined,
                    totalWeight: c.weight,
                    cubedWeight: totalCubedWeight,
                    chargedWeight,
                    totalVolumes,
                    volumeDetails: c.volumes,
                    dimensionSource: 'manual_override',
                    quotedFreight: quotes[0]?.price || 0,
                    breakdownJson: quotes,
                    strategyUsed: routing.strategy,
                });
                saved = !!simulationId;
            } catch (err) {
                console.log(`     ❌ Error saving simulation: ${(err as Error).message}`);
            }

            console.log(`     simulation_saved: ${saved ? 'YES' : 'NO'}`);
            console.log(`     env/auth_issues: ${quotes.length === 0 && routing.strategy === 'melhor_envio' ? 'POSSIBLE (No quotes returned, check token)' : 'NONE'}`);

            if (!ok) allPassed = false;
        } catch (err) {
            console.log(`  ❌ Error processing case: ${(err as Error).message}`);
            allPassed = false;
        }
    }

    console.log();
    console.log('═'.repeat(60));
    console.log(`  ${allPassed ? '✅ ALL E2E SIMULATOR TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('═'.repeat(60));

    process.exit(allPassed ? 0 : 1);
}

run().catch(console.error);
