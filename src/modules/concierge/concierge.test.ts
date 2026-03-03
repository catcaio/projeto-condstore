// ---------------------------------------------------------------------------
// Concierge Core — comprehensive vitest suite.
// Covers: required fields, forbidden fields, minimisation, tenant enforcement,
// score computation, recommendation selection, and tradeoff generation.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { getIntentRule } from './intent.engine';
import {
    validateRequiredFields,
    validateForbiddenFields,
    enforceTenantRequirement,
    applyMinimization,
} from './concierge.policy';
import { buildConciergeContext } from './context.builder';
import { generateOptionsForCotacao } from './option.engine';
import { buildRecommendation } from './recommendation.engine';

// ── Intent Engine ───────────────────────────────────────────────────────────

describe('getIntentRule', () => {
    it('returns correct rule for cotacao_simulada', () => {
        const rule = getIntentRule('cotacao_simulada');
        expect(rule.required).toContain('originCep');
        expect(rule.required).toContain('destinationCep');
        expect(rule.required).toContain('weight');
        expect(rule.forbidden).toContain('cpf');
        expect(rule.requiresTenant).toBe(false);
    });

    it('returns correct rule for pedido (requires tenant)', () => {
        const rule = getIntentRule('pedido');
        expect(rule.requiresTenant).toBe(true);
        expect(rule.required).toContain('productId');
    });
});

// ── Policy: Required Fields ─────────────────────────────────────────────────

describe('validateRequiredFields', () => {
    it('throws when required fields are missing', () => {
        const rule = getIntentRule('cotacao_simulada');
        const input = { originCep: '01001000' }; // missing destinationCep, weight

        expect(() => validateRequiredFields(input, rule)).toThrow(/missing required/);
    });

    it('throws when required field is empty string', () => {
        const rule = getIntentRule('cotacao_simulada');
        const input = { originCep: '', destinationCep: '02002000', weight: 5 };

        expect(() => validateRequiredFields(input, rule)).toThrow(/originCep/);
    });

    it('passes when all required fields are present', () => {
        const rule = getIntentRule('cotacao_simulada');
        const input = { originCep: '01001000', destinationCep: '02002000', weight: 5 };

        expect(() => validateRequiredFields(input, rule)).not.toThrow();
    });
});

// ── Policy: Forbidden Fields ────────────────────────────────────────────────

describe('validateForbiddenFields', () => {
    it('throws when forbidden fields are present', () => {
        const rule = getIntentRule('cotacao_simulada');
        const input = { originCep: '01001000', cpf: '12345678900' };

        expect(() => validateForbiddenFields(input, rule)).toThrow(/forbidden/);
    });

    it('passes when no forbidden fields are present', () => {
        const rule = getIntentRule('cotacao_simulada');
        const input = { originCep: '01001000', destinationCep: '02002000', weight: 5 };

        expect(() => validateForbiddenFields(input, rule)).not.toThrow();
    });
});

// ── Policy: Tenant Enforcement ──────────────────────────────────────────────

describe('enforceTenantRequirement', () => {
    it('throws when tenant is required but missing', () => {
        const rule = getIntentRule('pedido');

        expect(() => enforceTenantRequirement({}, rule)).toThrow(/tenantId is required/);
    });

    it('passes when tenant is not required', () => {
        const rule = getIntentRule('cotacao_simulada');

        expect(() => enforceTenantRequirement({}, rule)).not.toThrow();
    });
});

// ── Policy: Minimisation ────────────────────────────────────────────────────

describe('applyMinimization', () => {
    it('removes extra fields not in required or allowlist', () => {
        const rule = getIntentRule('cotacao_simulada');
        const input = {
            originCep: '01001000',
            destinationCep: '02002000',
            weight: 5,
            extraField: 'should be removed',
            anotherOne: 42,
        };

        const minimised = applyMinimization(input, rule);

        expect(minimised['originCep']).toBe('01001000');
        expect(minimised['weight']).toBe(5);
        expect(minimised['extraField']).toBeUndefined();
        expect(minimised['anotherOne']).toBeUndefined();
    });

    it('never returns forbidden fields even if present', () => {
        const rule = getIntentRule('cotacao_simulada');
        const input = {
            originCep: '01001000',
            destinationCep: '02002000',
            weight: 5,
            cpf: '12345678900',
        };

        const minimised = applyMinimization(input, rule);
        expect(minimised['cpf']).toBeUndefined();
    });
});

// ── Context Builder ─────────────────────────────────────────────────────────

describe('buildConciergeContext', () => {
    it('builds a validated context for cotacao_simulada', () => {
        const ctx = buildConciergeContext(
            'cotacao_simulada',
            { originCep: '01001000', destinationCep: '02002000', weight: 5, extraStuff: 'gone' },
        );

        expect(ctx.intent).toBe('cotacao_simulada');
        expect(ctx.fields['originCep']).toBe('01001000');
        expect(ctx.fields['extraStuff']).toBeUndefined();
        expect(ctx.createdAt).toBeInstanceOf(Date);
    });

    it('throws for pedido without tenantId', () => {
        expect(() =>
            buildConciergeContext('pedido', { productId: 'P1', quantity: 2 }),
        ).toThrow(/tenantId/);
    });
});

// ── Option Engine ───────────────────────────────────────────────────────────

describe('generateOptionsForCotacao', () => {
    it('returns exactly 3 options', () => {
        const options = generateOptionsForCotacao({
            originCep: '01001000',
            destinationCep: '02002000',
            weight: 5,
        });

        expect(options).toHaveLength(3);
    });

    it('returns options sorted by score descending', () => {
        const options = generateOptionsForCotacao({
            originCep: '01001000',
            destinationCep: '02002000',
            weight: 5,
        });

        expect(options[0].score).toBeGreaterThanOrEqual(options[1].score);
        expect(options[1].score).toBeGreaterThanOrEqual(options[2].score);
    });

    it('produces scores between 0 and 1', () => {
        const options = generateOptionsForCotacao({
            originCep: '12345678',
            destinationCep: '87654321',
            weight: 10,
        });

        for (const opt of options) {
            expect(opt.score).toBeGreaterThanOrEqual(0);
            expect(opt.score).toBeLessThanOrEqual(1);
        }
    });

    it('is deterministic (same input → same output)', () => {
        const input = { originCep: '01001000', destinationCep: '02002000', weight: 5 };
        const a = generateOptionsForCotacao(input);
        const b = generateOptionsForCotacao(input);

        expect(a).toEqual(b);
    });
});

// ── Recommendation Engine ───────────────────────────────────────────────────

describe('buildRecommendation', () => {
    it('selects the best option by score', () => {
        const options = generateOptionsForCotacao({
            originCep: '01001000',
            destinationCep: '02002000',
            weight: 5,
        });

        const rec = buildRecommendation(options);
        expect(rec.bestOptionId).toBe(options[0].id);
    });

    it('generates explanation with deadline', () => {
        const options = generateOptionsForCotacao({
            originCep: '01001000',
            destinationCep: '02002000',
            weight: 5,
        });

        const rec = buildRecommendation(options);
        expect(rec.explanation).toContain('dias');
        expect(rec.explanation).toContain('Recomendado');
    });

    it('generates tradeoff when price difference > 20%', () => {
        // Use options with known large price spread
        const options = [
            { id: 'expensive', price: 100, deadlineDays: 2, score: 0.9 },
            { id: 'cheap', price: 50, deadlineDays: 10, score: 0.4 },
        ];

        const rec = buildRecommendation(options);
        expect(rec.tradeoff).toBeDefined();
        expect(rec.tradeoff).toContain('cheap');
        expect(rec.tradeoff).toContain('mais barato');
    });

    it('does not generate tradeoff when price difference <= 20%', () => {
        const options = [
            { id: 'A', price: 100, deadlineDays: 2, score: 0.9 },
            { id: 'B', price: 95, deadlineDays: 3, score: 0.7 },
        ];

        const rec = buildRecommendation(options);
        expect(rec.tradeoff).toBeUndefined();
    });

    it('throws when options array is empty', () => {
        expect(() => buildRecommendation([])).toThrow(/empty options/);
    });
});
