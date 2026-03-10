import { getQuotesFromMelhorEnvio, MelhorEnvioQuoteRequest } from './src/modules/freight/adapters/melhor-envio-adapter';
import dotenv from 'dotenv';

// Load from vercel production env
dotenv.config({ path: '.env.vercel.production' });

async function runTests() {
    const scenarios: Record<string, MelhorEnvioQuoteRequest> = {
        'Cenario A': {
            originCep: '88131640', // From .env
            destinationCep: '13214-525',
            weight: 4.9,
            width: 30,
            height: 30,
            length: 30,
            insuranceValue: 150
        },
        'Cenario B': {
            originCep: '88131640',
            destinationCep: '01001-000',
            weight: 5,
            width: 30,
            height: 30,
            length: 30,
            insuranceValue: 150
        },
        'Cenario C': {
            originCep: '88131640',
            destinationCep: '89207-407',
            weight: 12,
            width: 60,
            height: 1, // ME requires min height 2, we pass 1. adapter fixes to 2cm.
            length: 55,
            insuranceValue: 0
        },
        'Cenario D': {
            originCep: '88131640',
            destinationCep: '68030-991',
            weight: 50,
            width: 80,
            height: 60,
            length: 40,
            insuranceValue: 1500
        },
        'Cenario Extra 1 (Peso baixo)': {
            originCep: '88131640',
            destinationCep: '01001-000',
            weight: 0.1,
            width: 15,
            height: 5,
            length: 20,
            insuranceValue: 50
        },
        'Cenario Extra 2 (Peso alto)': {
            originCep: '88131640',
            destinationCep: '01001-000',
            weight: 100,
            width: 100,
            height: 100,
            length: 100,
            insuranceValue: 3000
        }
    };

    for (const [name, request] of Object.entries(scenarios)) {
        console.log(`\n--- ${name} ---`);
        console.log(JSON.stringify(request));
        try {
            const start = Date.now();
            const result = await getQuotesFromMelhorEnvio(request);
            console.log(`Result (${Date.now() - start}ms):`, JSON.stringify(result, null, 2));
        } catch (e) {
            console.error('Error:', e);
        }
    }
}

runTests();
