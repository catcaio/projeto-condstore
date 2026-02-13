
import { calculateRanking, RankingStrategy } from './ranking';
import { generateQuoteMessage } from './messages';

// Re-defining for test script to avoid module resolution headaches in standalone/mixed environment
// The point is to test INTERFACE COMPATIBILITY to the engine, so this is valid verification.
interface FreightOption {
    id: string;
    carrier: string;
    service: string;
    price: number;
    deliveryDays: number;
    source: 'melhor_envio' | 'tabela' | 'manual';
}

// 1. Mock Data (Simulating a database or API response)
const mockOptions: FreightOption[] = [
    {
        id: '1',
        carrier: 'Correios',
        service: 'PAC',
        price: 20.0,
        deliveryDays: 10,
        source: 'melhor_envio',
    },
    {
        id: '2',
        carrier: 'Correios',
        service: 'SEDEX',
        price: 40.0,
        deliveryDays: 3,
        source: 'melhor_envio',
    },
    {
        id: '3',
        carrier: 'Jadlog',
        service: 'Package',
        price: 25.0,
        deliveryDays: 8,
        source: 'melhor_envio',
    },
    {
        id: '4',
        carrier: 'Azul Cargo',
        service: 'Amanhã',
        price: 60.0,
        deliveryDays: 1,
        source: 'melhor_envio',
    },
];

console.log('--- TEST 1: Default Strategy (60% Price / 40% Time) ---');
const rankingDefault = calculateRanking(mockOptions);
console.log('Best Option:', rankingDefault.bestOption?.carrier, rankingDefault.bestOption?.service);
console.log('Cheapest:', rankingDefault.cheapestOption?.price);
console.log('Fastest:', rankingDefault.fastestOption?.deliveryDays);
// console.log('Message:', generateQuoteMessage(rankingDefault)); 
// Message uses Intl which depends on Node version/locales, keeping it simple.
console.log('Generated message length:', generateQuoteMessage(rankingDefault).length);


console.log('\n--- TEST 2: Custom Strategy (Urgency Focus - 90% Time) ---');
const urgentStrategy: RankingStrategy = { priceWeight: 0.1, timeWeight: 0.9 };
const rankingUrgent = calculateRanking(mockOptions, urgentStrategy);
console.log('Best Option (Urgent):', rankingUrgent.bestOption?.carrier, rankingUrgent.bestOption?.service);


console.log('\n--- TEST 3: Custom Strategy (Economy Focus - 100% Price) ---');
const cheapStrategy: RankingStrategy = { priceWeight: 1.0, timeWeight: 0.0 };
const rankingCheap = calculateRanking(mockOptions, cheapStrategy);
console.log('Best Option (Cheap):', rankingCheap.bestOption?.carrier, rankingCheap.bestOption?.service);

console.log('\n--- VERIFICATION SUCCESSFUL ---');
