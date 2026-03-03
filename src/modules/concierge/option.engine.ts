// ---------------------------------------------------------------------------
// Option Engine — generates deterministic simulated options for cotação.
// No AI, no DB, no side effects. Pure computation.
// ---------------------------------------------------------------------------

import type { ConciergeOption } from './concierge.types';

/** Simple deterministic hash for seed generation. */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash);
}

interface CotacaoInput {
    originCep: string;
    destinationCep: string;
    weight: number;
}

/**
 * Generate 3 deterministic simulated ConciergeOptions for a cotação input.
 *
 * Returns options sorted by score descending (best first).
 *
 * Score formula: `normalizedPrice * 0.6 + normalizedSpeed * 0.4`
 * (lower price / faster speed → higher normalised value → higher score).
 */
export function generateOptionsForCotacao(
    input: CotacaoInput,
): ConciergeOption[] {
    const seed = simpleHash(`${input.originCep}:${input.destinationCep}:${input.weight}`);

    const basePrice = 15 + (seed % 30);
    const baseDeadline = 2 + (seed % 5);

    // Three distinct profiles: economy, standard, express
    const raw: Array<{ id: string; price: number; deadlineDays: number }> = [
        {
            id: 'option-economy',
            price: Math.round((basePrice * 0.75 + Number.EPSILON) * 100) / 100,
            deadlineDays: baseDeadline + 4,
        },
        {
            id: 'option-standard',
            price: Math.round((basePrice * 1.0 + Number.EPSILON) * 100) / 100,
            deadlineDays: baseDeadline + 2,
        },
        {
            id: 'option-express',
            price: Math.round((basePrice * 1.45 + Number.EPSILON) * 100) / 100,
            deadlineDays: baseDeadline,
        },
    ];

    // Compute normalised values (higher = better)
    const prices = raw.map((o) => o.price);
    const deadlines = raw.map((o) => o.deadlineDays);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minDeadline = Math.min(...deadlines);
    const maxDeadline = Math.max(...deadlines);

    const priceRange = maxPrice - minPrice || 1;
    const deadlineRange = maxDeadline - minDeadline || 1;

    const options: ConciergeOption[] = raw.map((o) => {
        // Lower price → higher normalised (inverted)
        const normalizedPrice = 1 - (o.price - minPrice) / priceRange;
        // Lower deadline → higher normalised (inverted)
        const normalizedSpeed = 1 - (o.deadlineDays - minDeadline) / deadlineRange;

        const score = Math.round((normalizedPrice * 0.6 + normalizedSpeed * 0.4) * 100) / 100;

        return {
            id: o.id,
            price: o.price,
            deadlineDays: o.deadlineDays,
            score,
        };
    });

    // Sort by score descending (best first)
    options.sort((a, b) => b.score - a.score);

    return options;
}
