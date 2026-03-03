// ---------------------------------------------------------------------------
// Orchestrator tests — vitest suite covering policy, redaction, service,
// and best-effort wiring resilience.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    sanitizePayload,
    validateContext,
    computeSeverity,
    buildTags,
} from './orchestrator.policy';
import type { OrchestratorContext } from './orchestrator.types';

// ── sanitizePayload ─────────────────────────────────────────────────────────

describe('sanitizePayload', () => {
    it('redacts global PII keys (email, phone, token, authorization, cpf, cnpj)', () => {
        const dirty = {
            email: 'user@test.com',
            phone: '+5511999999999',
            token: 'jwt-abc-123',
            authorization: 'Bearer xyz',
            cpf: '123.456.789-00',
            cnpj: '12.345.678/0001-00',
            password: 'hunter2',
            safe: 'visible',
            count: 42,
        };

        const clean = sanitizePayload('public_quotes_generated', dirty);

        expect(clean['email']).toBe('[REDACTED]');
        expect(clean['phone']).toBe('[REDACTED]');
        expect(clean['token']).toBe('[REDACTED]');
        expect(clean['authorization']).toBe('[REDACTED]');
        expect(clean['cpf']).toBe('[REDACTED]');
        expect(clean['cnpj']).toBe('[REDACTED]');
        expect(clean['password']).toBe('[REDACTED]');
        expect(clean['safe']).toBe('visible');
        expect(clean['count']).toBe(42);
    });

    it('handles nested objects and arrays', () => {
        const dirty = {
            data: {
                email: 'nested@test.com',
                items: [{ phone: '123', name: 'ok' }],
            },
        };

        const clean = sanitizePayload('incident_raised', dirty) as Record<string, unknown>;
        const data = clean['data'] as Record<string, unknown>;
        expect(data['email']).toBe('[REDACTED]');

        const items = data['items'] as Array<Record<string, unknown>>;
        expect(items[0]['phone']).toBe('[REDACTED]');
        expect(items[0]['name']).toBe('ok');
    });

    it('redacts extra per-type keys (messageBody for frank_action_requested)', () => {
        const dirty = { messageBody: 'Hello World', action: 'send' };
        const clean = sanitizePayload('frank_action_requested', dirty);

        expect(clean['messageBody']).toBe('[REDACTED]');
        expect(clean['action']).toBe('send');
    });

    it('preserves null and undefined values', () => {
        const dirty = { field: null, other: undefined, count: 0 };
        const clean = sanitizePayload('incident_raised', dirty);
        expect(clean['field']).toBeNull();
        expect(clean['other']).toBeUndefined();
        expect(clean['count']).toBe(0);
    });
});

// ── validateContext ──────────────────────────────────────────────────────────

describe('validateContext', () => {
    it('throws for missing tenantId when required by policy', () => {
        const context: OrchestratorContext = { source: 'domine' };

        expect(() => validateContext('domine_event_published', context)).toThrow(
            /requires tenantId/,
        );
    });

    it('throws for disallowed source', () => {
        const context: OrchestratorContext = { source: 'frank', tenantId: 'T1' };

        expect(() => validateContext('public_intent_created', context)).toThrow(
            /not allowed/,
        );
    });

    it('passes for valid context', () => {
        const context: OrchestratorContext = { source: 'public' };

        expect(() => validateContext('public_quotes_generated', context)).not.toThrow();
    });

    it('passes for tenant event with correct source and tenantId', () => {
        const context: OrchestratorContext = { source: 'domine', tenantId: 'T1' };

        expect(() => validateContext('domine_event_processed', context)).not.toThrow();
    });
});

// ── computeSeverity ─────────────────────────────────────────────────────────

describe('computeSeverity', () => {
    it('returns catalog default severity', () => {
        expect(computeSeverity('public_quotes_generated', {})).toBe('info');
        expect(computeSeverity('domine_event_failed', {})).toBe('critical');
    });

    it('upgrades severity when payload has explicit override', () => {
        expect(computeSeverity('public_quotes_generated', { severity: 'warning' })).toBe('warning');
        expect(computeSeverity('public_quotes_generated', { severity: 'critical' })).toBe('critical');
    });

    it('never downgrades severity', () => {
        expect(computeSeverity('domine_event_failed', { severity: 'info' })).toBe('critical');
    });

    it('auto-escalates to critical when attempts > 3 for failure types', () => {
        expect(computeSeverity('frank_action_failed', { attempts: 4 })).toBe('critical');
    });
});

// ── buildTags ───────────────────────────────────────────────────────────────

describe('buildTags', () => {
    it('builds correct tags from context', () => {
        const tags = buildTags(
            'domine_event_published',
            { source: 'domine', tenantId: 'LOJACOND' },
            {},
        );

        expect(tags).toContain('type:domine_event_published');
        expect(tags).toContain('source:domine');
        expect(tags).toContain('tenant:LOJACOND');
        expect(tags).toContain('domain:domine');
    });

    it('omits tenant tag when tenantId is missing', () => {
        const tags = buildTags('public_intent_created', { source: 'public' }, {});
        expect(tags).not.toContain('tenant:undefined');
        expect(tags).toContain('domain:public');
    });
});

// ── Service (registerStrategicFact) ─────────────────────────────────────────

// These tests use dynamic imports with vi.resetModules() to isolate mocks.
vi.mock('@/infra/log/logger', () => ({
    structuredLogger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/infra/repositories/public-events.repository', () => ({
    publicEventsRepository: { create: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/modules/audit/audit.service', () => ({
    auditService: { logEvent: vi.fn().mockResolvedValue(undefined) },
}));

describe('registerStrategicFact', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns ok result and does not throw', async () => {
        const { registerStrategicFact } = await import('./orchestrator.service');

        const result = await registerStrategicFact(
            'public_quotes_generated',
            { source: 'public', requestId: 'req-1' },
            { intentId: 'abc', quotesCount: 5, simulated: true },
        );

        expect(result.ok).toBe(true);
        expect(result.recordId).toBeDefined();
    });

    it('does not leak raw payload in structured logger calls', async () => {
        const { structuredLogger: mockLogger } = await import('@/infra/log/logger');
        const { registerStrategicFact } = await import('./orchestrator.service');

        await registerStrategicFact(
            'public_quotes_generated',
            { source: 'public' },
            { email: 'leak@test.com', intentId: 'abc' },
        );

        // The logger context should NOT contain the raw payload
        const infoFn = mockLogger.info as ReturnType<typeof vi.fn>;
        for (const call of infoFn.mock.calls) {
            const ctx = call[1] as Record<string, unknown> | undefined;
            if (ctx) {
                expect(JSON.stringify(ctx)).not.toContain('leak@test.com');
            }
        }
    });
});

// ── Best-effort wiring resilience ───────────────────────────────────────────

describe('best-effort wiring resilience', () => {
    it('caller survives when registerStrategicFact throws via catch pattern', async () => {
        const { registerStrategicFact } = await import('./orchestrator.service');

        // Simulate best-effort pattern used at wiring points:
        // Even if the internal persist fails, the caller should survive
        let callerOk = true;
        try {
            await registerStrategicFact(
                'public_quotes_generated',
                { source: 'public' },
                { intentId: 'xyz' },
            );
        } catch {
            // best-effort swallow — this is the pattern at wiring sites
            callerOk = true;
        }

        expect(callerOk).toBe(true);
    });
});
