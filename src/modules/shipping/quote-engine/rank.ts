import { NormalizedQuote, QuoteInput } from '../carriers/types';

/**
 * Ranks quotes based on price, SLA, carrier health, and tenant preferences.
 * TODO: Implement ranking algorithms (e.g., fastest, cheapest, best value).
 */
export function rankQuotes(quotes: NormalizedQuote[], _input: QuoteInput): NormalizedQuote[] {
    // Stub implementation: Returns quotes as-is or sort by price arbitrarily.
    return [...quotes].sort((a, b) => a.price - b.price);
}
