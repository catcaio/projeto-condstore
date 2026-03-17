import 'dotenv/config';
import { TableDrivenAdapter } from '../src/modules/freight/quoting/table-driven-adapter';

const TEST_ZONES = [
    { name: 'SC (Florianópolis)', cep: '88010000' },
    { name: 'PR (Curitiba)', cep: '80010000' },
    { name: 'RS (Porto Alegre)', cep: '90010000' },
    { name: 'SP Capital', cep: '01001000' },
    { name: 'SP Interior (Campinas)', cep: '13010000' },
    { name: 'MG (Belo Horizonte)', cep: '30110000' },
    { name: 'RJ (Rio de Janeiro)', cep: '20010000' },
];

const PACKAGES = [
    { desc: 'Light Box (10kg)', weight: 10, w: 30, h: 30, l: 30, value: 500 },
    { desc: 'Heavy Box (60kg)', weight: 60, w: 60, h: 60, l: 60, value: 3000 },
];

const CARRIERS = ['MENGUE', 'BRASPRESS', 'MOVVI'];
const TENANT_ID = 'tenant1';

async function main() {
    console.log('--- FREIGHT RATE VALIDATION ---\n');

    for (const carrier of CARRIERS) {
        console.log(`\n========================================`);
        console.log(`Evaluating Carrier: ${carrier}`);
        console.log(`========================================`);

        const adapter = new TableDrivenAdapter(carrier, TENANT_ID);

        for (const zone of TEST_ZONES) {
            console.log(`\n📍 Zone: ${zone.name} (CEP: ${zone.cep})`);

            for (const pkg of PACKAGES) {
                const result = await adapter.calculateFreight({
                    originCep: '88131640', // Palhoça/SC
                    destinationCep: zone.cep,
                    weightInKg: pkg.weight,
                    widthCm: pkg.w,
                    heightCm: pkg.h,
                    lengthCm: pkg.l,
                    insuranceValue: pkg.value,
                    packageType: 'box'
                });

                if (result) {
                    console.log(`  📦 Package: ${pkg.desc} -> Freight: R$ ${result.totalFreight.toFixed(2)} (Delivery: ${result.deliveryDays} days, Band: ${result.weightBand}kg | Base: R$ ${result.basePrice.toFixed(2)})`);
                } else {
                    console.log(`  📦 Package: ${pkg.desc} -> No coverage / Rate missing for weight range.`);
                }
            }
        }
    }

    console.log('\n✅ Validation script completed.');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
