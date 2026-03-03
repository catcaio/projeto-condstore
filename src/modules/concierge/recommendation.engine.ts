// ---------------------------------------------------------------------------
// Recommendation Engine — selects the best option and generates a
// human-readable explanation with optional tradeoff analysis.
// No AI, no DB, pure computation.
// ---------------------------------------------------------------------------

import type { ConciergeOption, ConciergeRecommendation } from './concierge.types';

/**
 * Build a recommendation from an array of scored options.
 *
 * Rules:
 * 1. Select the option with the highest score as `bestOptionId`.
 * 2. Generate a standardised explanation.
 * 3. If the cheapest option's price is >20% lower than the best,
 *    generate a tradeoff string explaining the cheaper-but-slower alternative.
 *
 * @throws {Error} if options array is empty.
 */
export function buildRecommendation(
    options: ConciergeOption[],
): ConciergeRecommendation {
    if (options.length === 0) {
        throw new Error('Concierge: cannot build recommendation from empty options.');
    }

    // Options should already be sorted desc by score, but defensively find max
    const best = options.reduce((prev, curr) =>
        curr.score > prev.score ? curr : prev,
    );

    const explanation =
        `Recomendado por melhor equilíbrio entre prazo (${best.deadlineDays} dias) e custo.`;

    // Find cheapest option
    const cheapest = options.reduce((prev, curr) =>
        curr.price < prev.price ? curr : prev,
    );

    let tradeoff: string | undefined;

    // Only generate tradeoff if cheapest is different from best and >20% cheaper
    if (cheapest.id !== best.id) {
        const priceDiffPct = ((best.price - cheapest.price) / best.price) * 100;

        if (priceDiffPct > 20) {
            tradeoff =
                `Alternativa mais barata: ${cheapest.id} por R$${cheapest.price.toFixed(2)} ` +
                `(${priceDiffPct.toFixed(0)}% mais barato), porém com prazo de ${cheapest.deadlineDays} dias.`;
        }
    }

    return {
        bestOptionId: best.id,
        explanation,
        tradeoff,
    };
}
