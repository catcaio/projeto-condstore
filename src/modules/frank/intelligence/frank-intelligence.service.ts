/**
 * FRK-8/008 — Frank intelligence service.
 *
 * Central orchestrator: applies the deterministic evaluators, filters by the
 * tenant's preferences (disabled types + confidence cutoff), attaches the
 * explainable `reason`, and persists suggestions so they are traceable.
 *
 * NON-GOALS (declared): this service NEVER executes actions. The `action`
 * payload of a suggestion is only the operator's OPTION; post-approval
 * execution is delegated to the FRK-9 execution boundary.
 */
import { randomUUID } from 'crypto';
import {
  assertConfidence,
  assertFeedbackOutcome,
  buildSuggestion,
  DEFAULT_MIN_CONFIDENCE,
  type FrankFeedback,
  type FrankFeedbackOutcome,
  type FrankSuggestion,
  type FrankSuggestionInput,
  type FrankSurface,
  type FrankTenantPreferences,
} from './frank-intelligence.types';
import type { IntelligenceStore } from './frank-intelligence.repository';

export interface IntelligenceContext {
  tenantId: string;
  surface: FrankSurface;
  /** Deterministic inputs produced by the Cockpit / domain queries. */
  signals: Record<string, unknown>;
}

export interface IntelligencePreferencesStore {
  getPreferences(tenantId: string): Promise<FrankTenantPreferences>;
}

/**
 * The evaluator signature: given tenant + surface signals, return candidate
 * suggestion inputs (not yet filtered / persisted).
 */
export type SuggestionEvaluator = (context: IntelligenceContext) => Promise<FrankSuggestionInput[]>;

export class FrankIntelligenceService {
  constructor(
    private readonly store: IntelligenceStore,
    private readonly preferences: IntelligencePreferencesStore,
    private readonly evaluators: SuggestionEvaluator[],
  ) {}

  /**
   * Runs all evaluators for a surface, applies the tenant's preferences
   * (disabled types, confidence cutoff) and persists the survivors.
   * Returns the suggestions ready to render in the Cockpit surface.
   */
  async generateSuggestions(context: IntelligenceContext): Promise<FrankSuggestion[]> {
    const prefs = await this.preferences.getPreferences(context.tenantId);
    const minConfidence = prefs.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    assertConfidence(minConfidence);

    const candidates: FrankSuggestionInput[] = [];
    for (const evaluator of this.evaluators) {
      const produced = await evaluator(context);
      candidates.push(...produced);
    }

    const filtered = candidates.filter(
      (c) => !prefs.disabledTypes.includes(c.type) && c.confidence >= minConfidence,
    );

    const now = new Date().toISOString();
    const saved: FrankSuggestion[] = [];
    for (const candidate of filtered) {
      const suggestion = buildSuggestion(candidate, {
        id: randomUUID(),
        tenantId: context.tenantId,
        createdAt: now,
      });
      await this.store.saveSuggestion(suggestion);
      saved.push(suggestion);
    }
    return saved;
  }

  async listSuggestions(args: { tenantId: string; surface?: FrankSurface }): Promise<FrankSuggestion[]> {
    return this.store.listSuggestions(args);
  }

  async recordFeedback(args: {
    tenantId: string;
    suggestionId: string;
    outcome: FrankFeedbackOutcome;
  }): Promise<FrankFeedback> {
    assertFeedbackOutcome(args.outcome);
    const feedback: FrankFeedback = {
      id: randomUUID(),
      tenantId: args.tenantId,
      suggestionId: args.suggestionId,
      outcome: args.outcome,
      createdAt: new Date().toISOString(),
    };
    await this.store.saveFeedback(feedback);
    return feedback;
  }

  async acceptanceRate(args: { tenantId: string }): Promise<{ accepted: number; rejected: number; rate: number | null }> {
    return this.store.acceptanceRate(args);
  }
}