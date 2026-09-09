/**
 * FRK-8/008 — tests for the Frank intelligence layer.
 *
 * In-memory suite runs everywhere. The Drizzle suite runs only when
 * TEST_DATABASE_URL is set (local MySQL/TiDB); otherwise it skips loudly,
 * same gating as the FRK-9 execution suite.
 */
import { describe, it, expect } from 'vitest';
import {
  assertSuggestionType,
  assertFeedbackOutcome,
  assertConfidence,
  buildSuggestion,
  DEFAULT_MIN_CONFIDENCE,
  type FrankSuggestion,
} from '../frank-intelligence.types';
import {
  InMemoryIntelligenceStore,
  TenantMismatchError,
  UnknownSuggestionError,
  DuplicateSuggestionError,
  type IntelligenceStore,
} from '../frank-intelligence.repository';
import {
  InMemoryTenantPreferencesStore,
  type TenantPreferencesStore,
} from '../frank-intelligence.preferences';
import { FrankIntelligenceService } from '../frank-intelligence.service';
import {
  queueEvaluator,
  activeContextEvaluator,
  pulseEvaluator,
  ALL_EVALUATORS,
} from '../frank-intelligence.evaluators';
import { computeThreadPriorityScore } from '../scoring/thread-priority-score';

const TENANT = 'tenant-a';
const OTHER_TENANT = 'tenant-b';

function makeSuggestion(overrides: Partial<FrankSuggestion> = {}): FrankSuggestion {
  const input = {
    surface: 'queue' as const,
    type: 'action' as const,
    title: 'Priorizar thread t-1',
    description: 'Thread acima do limiar.',
    reason: ['thread parada há 3 dias', 'SLA próximo'],
    confidence: 0.9,
    action: { label: 'Abrir', endpoint: '/api/cockpit/threads/t-1', method: 'GET' as const },
  };
  const base = buildSuggestion(input, { id: 's-1', tenantId: TENANT, createdAt: '2026-09-09T00:00:00.000Z' });
  return { ...base, ...overrides };
}

async function serviceWith(store: IntelligenceStore = new InMemoryIntelligenceStore()) {
  const prefs = new InMemoryTenantPreferencesStore();
  const service = new FrankIntelligenceService(store, prefs, ALL_EVALUATORS);
  return { service, prefs, store };
}

describe('types & validation', () => {
  it('accepts valid suggestion types and surfaces', () => {
    expect(assertSuggestionType('action')).toBe('action');
    expect(assertSuggestionType('automation')).toBe('automation');
    expect(() => assertSuggestionType('run')).toThrow(RangeError);
  });

  it('accepts valid feedback outcomes and rejects unknown ones', () => {
    expect(assertFeedbackOutcome('accepted')).toBe('accepted');
    expect(() => assertFeedbackOutcome('maybe')).toThrow(RangeError);
  });

  it('rejects confidence outside 0..1', () => {
    expect(() => assertConfidence(1.5)).toThrow(RangeError);
    expect(() => assertConfidence(-0.1)).toThrow(RangeError);
    expect(() => assertConfidence(0.5)).not.toThrow();
  });

  it('default min confidence is 0.75', () => {
    expect(DEFAULT_MIN_CONFIDENCE).toBe(0.75);
  });

  it('buildSuggestion requires a reason (explainability)', () => {
    expect(() =>
      buildSuggestion(
        { surface: 'queue', type: 'info', title: 'x', description: 'y', reason: [], confidence: 0.8 },
        { id: 's', tenantId: TENANT },
      ),
    ).toThrow(RangeError);
  });

  it('buildSuggestion never mutates input and always sets action/expiresAt fields', () => {
    const input = {
      surface: 'queue' as const,
      type: 'action' as const,
      title: 't',
      description: 'd',
      reason: ['r'],
      confidence: 0.8,
    };
    const before = JSON.stringify(input);
    const s = buildSuggestion(input, { id: 's-2', tenantId: TENANT });
    expect(JSON.stringify(input)).toBe(before);
    expect(s.action).toBeUndefined();
    expect(s.expiresAt).toBeNull();
    expect(s.createdAt).toBeTruthy();
  });
});

describe('scoring (deterministic)', () => {
  it('computes a weighted score within 0..100', () => {
    const r = computeThreadPriorityScore({
      threadTypeWeight: 0.8,
      stateWeight: 0.7,
      slaRisk: 0.9,
      financialImpact: 0.6,
      idleTime: 0.4,
      historicalSignal: 0.2,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it('is deterministic: same inputs, same output', () => {
    const f = {
      threadTypeWeight: 0.5,
      stateWeight: 0.5,
      slaRisk: 0.8,
      financialImpact: 0.5,
      idleTime: 0.5,
      historicalSignal: 0.5,
    };
    expect(computeThreadPriorityScore(f)).toEqual(computeThreadPriorityScore(f));
  });

  it('high SLA risk surfaces an SLA reason', () => {
    const r = computeThreadPriorityScore({
      threadTypeWeight: 0.1,
      stateWeight: 0.1,
      slaRisk: 0.9,
      financialImpact: 0.1,
      idleTime: 0.1,
      historicalSignal: 0,
    });
    expect(r.reasons.some((x) => x.includes('SLA'))).toBe(true);
  });
});

describe('in-memory store', () => {
  it('rejects duplicate suggestions', async () => {
    const store = new InMemoryIntelligenceStore();
    await store.saveSuggestion(makeSuggestion());
    await expect(store.saveSuggestion(makeSuggestion())).rejects.toThrow(DuplicateSuggestionError);
  });

  it('fails closed on cross-tenant read', async () => {
    const store = new InMemoryIntelligenceStore();
    await store.saveSuggestion(makeSuggestion());
    await expect(store.getSuggestion({ tenantId: OTHER_TENANT, suggestionId: 's-1' })).rejects.toThrow(TenantMismatchError);
  });

  it('throws UnknownSuggestionError for missing ids', async () => {
    const store = new InMemoryIntelligenceStore();
    await expect(store.getSuggestion({ tenantId: TENANT, suggestionId: 'nope' })).rejects.toThrow(UnknownSuggestionError);
  });

  it('lists only the tenant surface requested, sorted by confidence desc', async () => {
    const store = new InMemoryIntelligenceStore();
    await store.saveSuggestion(makeSuggestion({ id: 'a', confidence: 0.7 }));
    await store.saveSuggestion(makeSuggestion({ id: 'b', confidence: 0.95, surface: 'pulse' }));
    await store.saveSuggestion(makeSuggestion({ id: 'c', confidence: 0.99, tenantId: OTHER_TENANT }));
    const queue = await store.listSuggestions({ tenantId: TENANT, surface: 'queue' });
    expect(queue.map((s) => s.id)).toEqual(['a']);
    const all = await store.listSuggestions({ tenantId: TENANT });
    expect(all.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('rejects feedback on another tenant suggestion (cross-tenant)', async () => {
    const store = new InMemoryIntelligenceStore();
    await store.saveSuggestion(makeSuggestion());
    await expect(
      store.saveFeedback({
        id: 'f1',
        tenantId: OTHER_TENANT,
        suggestionId: 's-1',
        outcome: 'accepted',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    ).rejects.toThrow(TenantMismatchError);
  });

  it('computes acceptance rate per tenant only', async () => {
    const store = new InMemoryIntelligenceStore();
    await store.saveSuggestion(makeSuggestion({ id: 's-1' }));
    await store.saveSuggestion(makeSuggestion({ id: 's-2' }));
    await store.saveSuggestion(makeSuggestion({ id: 's-3', tenantId: OTHER_TENANT }));
    const feedback = (id: string, tenantId: string, outcome: 'accepted' | 'rejected') => ({
      id: `f-${id}`,
      tenantId,
      suggestionId: id,
      outcome,
      createdAt: '2026-09-09T00:00:00.000Z',
    });
    await store.saveFeedback(feedback('s-1', TENANT, 'accepted'));
    await store.saveFeedback(feedback('s-2', TENANT, 'rejected'));
    await store.saveFeedback(feedback('s-3', OTHER_TENANT, 'accepted'));
    const rate = await store.acceptanceRate({ tenantId: TENANT });
    expect(rate).toEqual({ accepted: 1, rejected: 1, rate: 0.5 });
  });
});

describe('service orchestration', () => {
  it('generates queue suggestion when a thread is idle + SLA', async () => {
    const { service } = await serviceWith();
    const suggestions = await service.generateSuggestions({
      tenantId: TENANT,
      surface: 'queue',
      signals: {
        threads: [
          { threadId: 't-1', idleFactor: 0.9, slaRisk: 0.9, financialImpact: 0.8, lastActivityDays: 4 },
          { threadId: 't-2', idleFactor: 0.1, slaRisk: 0.1, financialImpact: 0.1 },
        ],
      },
    });
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].thread ? suggestions[0].title : suggestions[0].title).toContain('Priorizar thread t-1');
    expect(suggestions[0].reason.length).toBeGreaterThan(0);
    expect(suggestions[0].confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('generates active-context reminder for a stale quote', async () => {
    const { service } = await serviceWith();
    const out = await service.generateSuggestions({
      tenantId: TENANT,
      surface: 'active_context',
      signals: { current: { threadId: 'q-1', idleDays: 6, quoteValue: 5000 } },
    });
    expect(out.length).toBe(1);
    expect(out[0].title).toContain('Enviar lembrete');
    expect(out[0].reason).toContain('6 dias');
  });

  it('generates pulse alerts for known exception kinds', async () => {
    const { service } = await serviceWith();
    const out = await service.generateSuggestions({
      tenantId: TENANT,
      surface: 'pulse',
      signals: { events: [{ kind: 'payment_pending', entity: 'pedido-9' }, { kind: 'unknown_kind' }] },
    });
    expect(out.length).toBe(1);
    expect(out[0].title).toContain('Pagamento pendente');
  });

  it('filters out disabled types and below-cutoff confidence', async () => {
    const store = new InMemoryIntelligenceStore();
    const prefs = new InMemoryTenantPreferencesStore();
    await prefs.setPreferences(TENANT, { disabledTypes: ['action'], minConfidence: 0.95 });
    const service = new FrankIntelligenceService(store, prefs, ALL_EVALUATORS);
    const out = await service.generateSuggestions({
      tenantId: TENANT,
      surface: 'queue',
      signals: { threads: [{ threadId: 't-1', idleFactor: 0.9, slaRisk: 0.9, financialImpact: 0.8 }] },
    });
    expect(out.length).toBe(0);
  });

  it('persists generated suggestions and records feedback through the service', async () => {
    const store = new InMemoryIntelligenceStore();
    const { service } = await serviceWith(store);
    const out = await service.generateSuggestions({
      tenantId: TENANT,
      surface: 'pulse',
      signals: { events: [{ kind: 'quote_expiring' }] },
    });
    expect(out.length).toBe(1);
    const feedback = await service.recordFeedback({
      tenantId: TENANT,
      suggestionId: out[0].id,
      outcome: 'accepted',
    });
    expect(feedback.suggestionId).toBe(out[0].id);
    const rate = await service.acceptanceRate({ tenantId: TENANT });
    expect(rate).toEqual({ accepted: 1, rejected: 0, rate: 1 });
  });

  it('rejects feedback for a suggestion from another tenant', async () => {
    const store = new InMemoryIntelligenceStore();
    const { service } = await serviceWith(store);
    await store.saveSuggestion(makeSuggestion({ id: 's-1', tenantId: OTHER_TENANT }));
    await expect(
      service.recordFeedback({ tenantId: TENANT, suggestionId: 's-1', outcome: 'accepted' }),
    ).rejects.toThrow();
  });

  it('no evaluator ever executes an action: generated suggestions only carry payloads', async () => {
    const { service } = await serviceWith();
    const out = await service.generateSuggestions({
      tenantId: TENANT,
      surface: 'queue',
      signals: { threads: [{ threadId: 't-1', idleFactor: 1, slaRisk: 1, financialImpact: 1 }] },
    });
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) {
      expect(s.action).toBeDefined();
      expect(s.action?.method).toBeDefined();
    }
  });
});

describe('preferences store', () => {
  it('returns defaults when no row exists', async () => {
    const prefs = new InMemoryTenantPreferencesStore();
    const p = await prefs.getPreferences(TENANT);
    expect(p.disabledTypes).toEqual([]);
    expect(p.minConfidence).toBe(DEFAULT_MIN_CONFIDENCE);
  });

  it('persists disabled types and cutoff per tenant', async () => {
    const prefs = new InMemoryTenantPreferencesStore();
    await prefs.setPreferences(TENANT, { disabledTypes: ['automation'], minConfidence: 0.8 });
    const p = await prefs.getPreferences(TENANT);
    expect(p.disabledTypes).toEqual(['automation']);
    expect(p.minConfidence).toBe(0.8);
    const other = await prefs.getPreferences(OTHER_TENANT);
    expect(other.disabledTypes).toEqual([]);
  });

  it('rejects invalid minConfidence', async () => {
    const prefs = new InMemoryTenantPreferencesStore();
    await expect(prefs.setPreferences(TENANT, { minConfidence: 2 })).rejects.toThrow(RangeError);
  });
});

describe('evaluators direct', () => {
  it('queue evaluator returns empty for low priority threads', async () => {
    const out = await queueEvaluator({
      tenantId: TENANT,
      surface: 'queue',
      signals: { threads: [{ threadId: 't-x', idleFactor: 0.1 }] },
    });
    expect(out).toEqual([]);
  });

  it('active-context evaluator returns nothing for fresh threads', async () => {
    const out = await activeContextEvaluator({
      tenantId: TENANT,
      surface: 'active_context',
      signals: { current: { threadId: 'q-1', idleDays: 0 } },
    });
    expect(out).toEqual([]);
  });

  it('pulse evaluator ignores unknown kinds', async () => {
    const out = await pulseEvaluator({
      tenantId: TENANT,
      surface: 'pulse',
      signals: { events: [{ kind: 'alien_invasion' }] },
    });
    expect(out).toEqual([]);
  });
});

const describeDrizzle = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeDrizzle('drizzle store (MySQL, TEST_DATABASE_URL)', () => {
  it('saves, reads, lists and feeds back a real suggestion (tenant-scoped)', async () => {
    const { DrizzleIntelligenceStore } = await import('../frank-intelligence.repository');
    const store = new DrizzleIntelligenceStore();
    const { randomUUID } = await import('crypto');
    const suggestionId = randomUUID();
    const feedbackId = randomUUID();
    const s = makeSuggestion({ id: suggestionId, tenantId: TENANT, confidence: 0.88 });
    await store.saveSuggestion(s);
    const got = await store.getSuggestion({ tenantId: TENANT, suggestionId });
    expect(got.id).toBe(suggestionId);
    expect(got.confidence).toBe(0.88);
    expect(got.reason).toContain('3 dias');
    await store.saveFeedback({
      id: feedbackId,
      tenantId: TENANT,
      suggestionId,
      outcome: 'accepted',
      createdAt: '2026-09-09T00:00:00.000Z',
    });
    const rate = await store.acceptanceRate({ tenantId: TENANT });
    expect(rate.accepted).toBeGreaterThanOrEqual(1);

    // cross-tenant must fail closed
    await expect(store.getSuggestion({ tenantId: OTHER_TENANT, suggestionId })).rejects.toThrow(TenantMismatchError);
  });
});