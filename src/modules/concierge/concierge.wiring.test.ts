// ---------------------------------------------------------------------------
// Concierge Wiring Tests — covers the wiring helper, fallback behavior,
// and integration safety guarantees.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { runConciergePipeline } from './concierge.wiring';

describe('runConciergePipeline', () => {
    it('returns a valid result with correct inputs', () => {
        const result = runConciergePipeline('01001000', '02002000', 5);

        expect(result).not.toBeNull();
        expect(result!.options).toHaveLength(3);
        expect(result!.recommendation.bestOptionId).toBeDefined();
        expect(result!.recommendation.explanation).toContain('dias');
    });

    it('returns null when originCep is missing', () => {
        const result = runConciergePipeline(undefined, '02002000', 5);
        expect(result).toBeNull();
    });

    it('returns null when destinationCep is missing', () => {
        const result = runConciergePipeline('01001000', undefined, 5);
        expect(result).toBeNull();
    });

    it('returns null when weight is missing', () => {
        const result = runConciergePipeline('01001000', '02002000', undefined);
        expect(result).toBeNull();
    });

    it('returns null when all inputs are undefined (total fallback)', () => {
        const result = runConciergePipeline(undefined, undefined, undefined);
        expect(result).toBeNull();
    });

    it('is deterministic (same input → same result)', () => {
        const a = runConciergePipeline('01001000', '02002000', 5);
        const b = runConciergePipeline('01001000', '02002000', 5);

        expect(a).toEqual(b);
    });

    it('options are sorted by score descending', () => {
        const result = runConciergePipeline('01001000', '02002000', 5);
        expect(result).not.toBeNull();

        const options = result!.options;
        expect(options[0].score).toBeGreaterThanOrEqual(options[1].score);
        expect(options[1].score).toBeGreaterThanOrEqual(options[2].score);
    });

    it('recommendation bestOptionId matches the highest-score option', () => {
        const result = runConciergePipeline('01001000', '02002000', 5);
        expect(result).not.toBeNull();

        expect(result!.recommendation.bestOptionId).toBe(result!.options[0].id);
    });
});
