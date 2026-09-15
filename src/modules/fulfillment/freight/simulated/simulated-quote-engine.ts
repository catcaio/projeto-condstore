import type { QuoteInput, NormalizedQuote } from '../carriers/types';
import { generateSimulatedQuotes } from './simulated-carriers';

export interface RankedQuotesResult {
    quotes: NormalizedQuote[];
    bestPriceId: string;
    bestSpeedId: string;
}

/**
 * Generate and rank simulated quotes for a given input + intentId seed.
 */
export function getSimulatedQuotes(input: QuoteInput, intentId: string): RankedQuotesResult {
    const quotes = generateSimulatedQuotes(input, intentId);

    // Sort by price to find cheapest
    const byPrice = [...quotes].sort((a, b) => a.price - b.price);
    // Sort by speed to find fastest
    const bySpeed = [...quotes].sort((a, b) => a.estimatedDeliveryDays - b.estimatedDeliveryDays || a.price - b.price);

    const bestPriceId = byPrice[0]?.carrierCode ?? '';
    const bestSpeedId = bySpeed[0]?.carrierCode ?? '';

    // Set priority scores (lower = better)
    const ranked = quotes.map((q) => ({
        ...q,
        priorityScore:
            q.carrierCode === bestPriceId ? 1 :
                q.carrierCode === bestSpeedId ? 2 : 5,
    }));

    // Sort by priority for the response
    ranked.sort((a, b) => a.priorityScore - b.priorityScore);

    return { quotes: ranked, bestPriceId, bestSpeedId };
}
