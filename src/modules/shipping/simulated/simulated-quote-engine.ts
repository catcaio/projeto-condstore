import type { QuoteInput, NormalizedQuote } from '../carriers/types';
import { generateSimulatedQuotes } from './simulated-carriers';

export interface RankedQuotesResult {
    quotes: NormalizedQuote[];
    bestPriceId: string;
    bestSpeedId: string;
    bestScoreId: string;
}

/**
 * Generate and rank simulated quotes for a given input + intentId seed.
 */
export function getSimulatedQuotes(input: QuoteInput, intentId: string): RankedQuotesResult {
    const quotes = generateSimulatedQuotes(input, intentId);

    if (quotes.length === 0) {
        return { quotes: [], bestPriceId: '', bestSpeedId: '', bestScoreId: '' };
    }

    // 1. Encontrar min/max para normalização
    const minPrice = Math.min(...quotes.map(q => q.price));
    const maxPrice = Math.max(...quotes.map(q => q.price));
    const minDays = Math.min(...quotes.map(q => q.estimatedDeliveryDays));
    const maxDays = Math.max(...quotes.map(q => q.estimatedDeliveryDays));

    const priceRange = maxPrice - minPrice || 1; // avoid /0
    const daysRange = maxDays - minDays || 1;

    // 2. Calcular Score
    let scoredQuotes = quotes.map(q => {
        // Normalizado: Menor valor = 1 (melhor), Maior = 0 (pior)
        const normPrice = 1 - ((q.price - minPrice) / priceRange);
        const normDays = 1 - ((q.estimatedDeliveryDays - minDays) / daysRange);

        // Pesos: 60% preço, 40% prazo
        const rawScore = (normPrice * 0.6) + (normDays * 0.4);
        const finalScore = Math.round(rawScore * 100);

        return {
            ...q,
            priorityScore: finalScore, // Agora priorityScore é a nota de 0 a 100 (maior = melhor)
        };
    });

    // 3. Ordenar por Score DESC, e desempatar por price ASC
    scoredQuotes.sort((a, b) => b.priorityScore - a.priorityScore || a.price - b.price);

    const bestPriceId = [...scoredQuotes].sort((a, b) => a.price - b.price)[0]?.carrierCode ?? '';
    const bestSpeedId = [...scoredQuotes].sort((a, b) => a.estimatedDeliveryDays - b.estimatedDeliveryDays || a.price - b.price)[0]?.carrierCode ?? '';
    const bestScoreId = scoredQuotes[0]?.carrierCode ?? '';

    return { quotes: scoredQuotes, bestPriceId, bestSpeedId, bestScoreId };
}
