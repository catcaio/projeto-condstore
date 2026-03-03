// ---------------------------------------------------------------------------
// Flow Mode V1 Regression Test — validates the end-to-end flow:
// cotação → concierge → orchestrator → strategic fact.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runConciergePipeline } from '@/modules/concierge/concierge.wiring';
import { sanitizePayload, validateContext, computeSeverity, buildTags } from '@/core/orchestrator/orchestrator.policy';

// ── Pipeline produces valid recommendation ──────────────────────────────────

describe('Flow Mode V1 end-to-end', () => {
    it('pipeline produces valid recommendation from cotação inputs', () => {
        const result = runConciergePipeline('01001000', '02002000', 5);

        expect(result).not.toBeNull();
        expect(result!.options).toHaveLength(3);
        expect(result!.recommendation.bestOptionId).toBeDefined();
        expect(result!.recommendation.explanation).toContain('dias');
    });

    it('pipeline is deterministic', () => {
        const a = runConciergePipeline('22041080', '09400000', 12);
        const b = runConciergePipeline('22041080', '09400000', 12);
        expect(a).toEqual(b);
    });

    it('options scores are between 0 and 1', () => {
        const result = runConciergePipeline('01001000', '02002000', 5);
        for (const opt of result!.options) {
            expect(opt.score).toBeGreaterThanOrEqual(0);
            expect(opt.score).toBeLessThanOrEqual(1);
        }
    });
});

// ── Strategic fact payload is PII-free ──────────────────────────────────────

describe('concierge_decision_made fact payload', () => {
    it('fact payload contains only metrics (zero PII)', () => {
        const result = runConciergePipeline('01001000', '02002000', 5)!;
        const avg = result.options.reduce((s, o) => s + o.score, 0) / result.options.length;

        const factPayload = {
            optionsCount: result.options.length,
            bestScore: result.options[0].score,
            hasTradeoff: !!result.recommendation.tradeoff,
            scoreAverage: Math.round(avg * 100) / 100,
        };

        // Ensure no PII keys exist
        const keys = Object.keys(factPayload);
        const piiKeys = ['email', 'phone', 'cpf', 'cnpj', 'token', 'authorization', 'originCep', 'destinationCep', 'weight'];
        for (const pii of piiKeys) {
            expect(keys).not.toContain(pii);
        }

        // Verify values are numbers/booleans only
        expect(typeof factPayload.optionsCount).toBe('number');
        expect(typeof factPayload.bestScore).toBe('number');
        expect(typeof factPayload.hasTradeoff).toBe('boolean');
        expect(typeof factPayload.scoreAverage).toBe('number');
    });

    it('orchestrator sanitizes any accidental PII leaks', () => {
        // Even if someone accidentally passed PII, the orchestrator would redact it
        const dirty = {
            optionsCount: 3,
            bestScore: 0.72,
            email: 'leak@test.com',
            cpf: '123.456.789-00',
            originCep: '01001000',
        };

        const clean = sanitizePayload('concierge_decision_made', dirty);

        expect(clean['optionsCount']).toBe(3);
        expect(clean['bestScore']).toBe(0.72);
        expect(clean['email']).toBe('[REDACTED]');
        expect(clean['cpf']).toBe('[REDACTED]');
        expect(clean['originCep']).toBe('[REDACTED]');
    });
});

// ── Orchestrator policy validation ──────────────────────────────────────────

describe('concierge_decision_made orchestrator policy', () => {
    it('validates source=public for concierge_decision_made', () => {
        expect(() => validateContext('concierge_decision_made', { source: 'public' })).not.toThrow();
    });

    it('rejects disallowed sources', () => {
        expect(() => validateContext('concierge_decision_made', { source: 'domine' })).toThrow(/not allowed/);
    });

    it('computes default severity as info', () => {
        expect(computeSeverity('concierge_decision_made', {})).toBe('info');
    });

    it('builds correct tags', () => {
        const tags = buildTags(
            'concierge_decision_made',
            { source: 'public', correlationId: 'intent-abc' },
            { optionsCount: 3 },
        );

        expect(tags).toContain('type:concierge_decision_made');
        expect(tags).toContain('source:public');
        expect(tags).toContain('domain:concierge');
    });
});

// ── Orchestrator service mock (best-effort resilience) ──────────────────────

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/infra/repositories/public-events.repository', () => ({
    publicEventsRepository: { create: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/modules/audit/audit.service', () => ({
    auditService: { logEvent: vi.fn().mockResolvedValue(undefined) },
}));

describe('orchestrator registerStrategicFact integration', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('registerStrategicFact succeeds for concierge_decision_made', async () => {
        const { registerStrategicFact } = await import('@/core/orchestrator/orchestrator.service');

        const result = await registerStrategicFact(
            'concierge_decision_made',
            { source: 'public', correlationId: 'intent-xyz' },
            { optionsCount: 3, bestScore: 0.72, hasTradeoff: true, scoreAverage: 0.55 },
        );

        expect(result.ok).toBe(true);
        expect(result.recordId).toBeDefined();
    });

    it('fact payload stored via publicEventsRepository.create', async () => {
        const { publicEventsRepository } = await import('@/infra/repositories/public-events.repository');
        const { registerStrategicFact } = await import('@/core/orchestrator/orchestrator.service');

        await registerStrategicFact(
            'concierge_decision_made',
            { source: 'public', correlationId: 'intent-xyz' },
            { optionsCount: 3, bestScore: 0.72 },
        );

        expect(publicEventsRepository.create).toHaveBeenCalledTimes(1);

        const call = (publicEventsRepository.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(call.eventType).toBe('orchestrator:concierge_decision_made');
        expect(JSON.stringify(call.payloadJson)).not.toContain('email');
        expect(JSON.stringify(call.payloadJson)).not.toContain('cpf');
    });
});
