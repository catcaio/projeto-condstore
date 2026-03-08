import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { resolveCarrierZone } from '../src/core/freight/zone-resolver';
import { TableDrivenAdapter } from '../src/modules/freight/table-driven-adapter';

const TEST_ZONES = [
    { name: 'SC (Florianópolis)', cep: '88010000' },
    { name: 'PR (Curitiba)', cep: '80010000' },
    { name: 'RS (Porto Alegre)', cep: '90010000' },
    { name: 'SP Capital', cep: '01001000' },
    { name: 'SP Interior (Piracicaba)', cep: '13400000' },
    { name: 'MG (Belo Horizonte)', cep: '30110000' },
    { name: 'RJ (Rio de Janeiro)', cep: '20010000' },
];

const CARRIERS = ['MENGUE', 'BRASPRESS', 'MOVVI'];
const TENANT_ID = 'tenant1';

async function main() {
    console.log('--- ZONE RESOLVER VALIDATION ---\n');

    for (const carrier of CARRIERS) {
        console.log(`\n========================================`);
        console.log(`Evaluating Carrier: ${carrier}`);
        console.log(`========================================`);

        const adapter = new TableDrivenAdapter(carrier, TENANT_ID);

        for (const zone of TEST_ZONES) {
            console.log(`\n📍 Region: ${zone.name} (CEP: ${zone.cep})`);

            const zoneCode = await resolveCarrierZone({
                tenantId: TENANT_ID,
                carrierName: carrier,
                cep: zone.cep
            });
            console.log(`  -> Resolved ZoneCode: ${zoneCode || 'NOT_FOUND'}`);

            const result = await adapter.calculateFreight({
                originCep: '88131640',
                destinationCep: zone.cep,
                weightInKg: 10,
                widthCm: 30,
                heightCm: 30,
                lengthCm: 30,
                insuranceValue: 500,
                packageType: 'box'
            });

            if (result) {
                console.log(`  -> Freight Total: R$ ${result.totalFreight.toFixed(2)} (Delivery: ${result.deliveryDays} days, Base: R$ ${result.basePrice.toFixed(2)})`);
            } else {
                console.log(`  -> Freight Total: No coverage`);
            }
        }
    }

    console.log('\n✅ Zone Resolver Test completed.');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
