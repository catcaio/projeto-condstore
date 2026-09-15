import { NormalizedQuote, QuoteInput } from '../carriers/types';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Weight configuration for each ranking criterion.
 * Must sum to 1.0 for deterministic scoring.
 */
export interface RankingWeights {
    price: number;
    delivery: number;
    tracking: number;
    health: number;
}

export interface RankingConfig {
    weights: RankingWeights;
    /** Carrier codes marked as degraded/down — penalized in ranking */
    degradedCarriers?: Set<string>;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS: RankingWeights = {
    price: 0.40,
    delivery: 0.35,
    tracking: 0.15,
    health: 0.10,
};

// ─── Ranking ────────────────────────────────────────────────────────────────

/**
 * Ranks quotes using a deterministic weighted-score algorithm.
 *
 * Criteria (default weights):
 *   - Price     (40%) — lower is better, linear scale
 *   - Delivery  (35%) — fewer days is better, linear scale
 *   - Tracking  (15%) — with tracking = 0, without = 1
 *   - Health    (10%) — healthy = 0, degraded/down = 1
 *
 * The final priorityScore is set on each quote (lower = better).
 * Result is sorted ascending by priorityScore, with price as tiebreaker.
 */
export function rankQuotes(
    quotes: NormalizedQuote[],
    _input: QuoteInput,
    config?: Partial<RankingConfig>,
): NormalizedQuote[] {
    if (quotes.length === 0) return [];
    if (quotes.length === 1) {
        return [{ ...quotes[0], priorityScore: 1 }];
    }

    const weights = { ...DEFAULT_WEIGHTS, ...config?.weights };
    const degraded = config?.degradedCarriers ?? new Set<string>();

    // Find min/max for normalization
    const prices = quotes.map(q => q.price);
    const days = quotes.map(q => q.estimatedDeliveryDays);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1; // avoid division by zero

    const minDays = Math.min(...days);
    const maxDays = Math.max(...days);
    const daysRange = maxDays - minDays || 1;

    const ranked = quotes.map(q => {
        // Normalize each criterion to 0..1 (lower is better)
        const priceScore = (q.price - minPrice) / priceRange;
        const deliveryScore = (q.estimatedDeliveryDays - minDays) / daysRange;
        const trackingScore = q.trackingProvided ? 0 : 1;
        const healthScore = degraded.has(q.carrierCode) ? 1 : 0;

        const compositeScore =
            weights.price * priceScore +
            weights.delivery * deliveryScore +
            weights.tracking * trackingScore +
            weights.health * healthScore;

        // Round to 4 decimals for determinism
        const priorityScore = Math.round(compositeScore * 10000) / 10000;

        return { ...q, priorityScore };
    });

    // Sort ascending by priorityScore, tiebreak by price
    ranked.sort((a, b) => {
        if (a.priorityScore !== b.priorityScore) return a.priorityScore - b.priorityScore;
        return a.price - b.price;
    });

    return ranked;
}
