
import { logger } from '../src/infra/logger';

// Mock function to test intent logic
function classifyIntent(body: string) {
    const normalizedBody = (body || '').trim().toLowerCase();

    console.log('Intent Classification Debug', {
        rawBody: body,
        normalizedBody: normalizedBody,
        length: normalizedBody.length
    });

    let intent = 'unknown';

    if (
        normalizedBody.includes('cotação') ||
        normalizedBody.includes('orcamento') ||
        normalizedBody.includes('orçamento')
    ) {
        intent = 'quote_request';
    } else if (
        normalizedBody.includes('preço') ||
        normalizedBody.includes('valor') ||
        normalizedBody.includes('frete') // ADDED: Specific support for 'frete'
    ) {
        intent = 'price_question';
    } else if (normalizedBody.includes('pedido')) {
        intent = 'order';
    }

    return intent;
}

// Test cases
const tests = [
    'frete',
    'Frete',
    'qual o valor do frete',
    'gostaria de saber o FRETE',
    '  frete  '
];

console.log('--- Intent Classification Tests ---');
tests.forEach(t => {
    const result = classifyIntent(t);
    console.log(`"${t}" -> ${result}`);
    if (result !== 'price_question') {
        console.error('FAIL: Expected price_question');
        process.exit(1);
    }
});
console.log('--- ALL PASS ---');
