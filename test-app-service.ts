import dotenv from 'dotenv';
import { FreightRequest } from './src/modules/freight/freight.types';

// Load from vercel production env to connect to production DB and Redis
dotenv.config({ path: '.env.vercel.production' });

async function runTests() {
    const { freightService } = await import('./src/modules/freight/freight.service');
    const scenarios: Record<string, FreightRequest> = {
        'Cenario 1': {
            destinationCep: '89207407', // SC
            quantity: 1,
            unitWeight: 12,
            dimensions: { width: 60, height: 55, length: 30 },
            tenantId: 'tenant1'
        },
        'Cenario 2': {
            destinationCep: '01001000', // SP
            quantity: 1,
            unitWeight: 5,
            dimensions: { width: 30, height: 30, length: 30 },
            tenantId: 'tenant1'
        },
        'Cenario 3': {
            destinationCep: '68030991', // PA
            quantity: 1,
            unitWeight: 50,
            dimensions: { width: 80, height: 40, length: 60 },
            tenantId: 'tenant1'
        },
        'Cenario 4': {
            destinationCep: '13214525', // SP
            quantity: 1,
            unitWeight: 2,
            dimensions: { width: 20, height: 20, length: 20 },
            tenantId: 'tenant1'
        },
        'Cenario 5': {
            destinationCep: '20040020', // RJ
            quantity: 1,
            unitWeight: 15,
            dimensions: { width: 50, height: 40, length: 40 },
            tenantId: 'tenant1'
        },
        'Cenario 6': {
            destinationCep: '01001000', // SP
            quantity: 3,
            unitWeight: 10,
            dimensions: { width: 40, height: 40, length: 40 },
            tenantId: 'tenant1'
        }
    };
    for (const [name, request] of Object.entries(scenarios)) {
        console.log(`\n--- ${name} ---`);
        console.log(JSON.stringify(request));
        try {
            const start = Date.now();
            const result = await freightService.calculateFreight(request);
            console.log(`Result (${Date.now() - start}ms):`, JSON.stringify({
                success: result.success,
                totalWeight: result.totalWeight,
                options: result.options
            }, null, 2));
        } catch (e) {
            console.error('Error:', e);
        }
    }
    process.exit(0);
}

runTests();
