/**
 * FRK-8/008 — Frank intelligence domain types.
 *
 * The intelligence layer produces RECOMMENDATIONS only. It never executes
 * actions: the `action` field of a suggestion carries the intent and the
 * payload of what the operator COULD do — the actual execution is delegated
 * to the existing execution boundary (execution-runtime / Run-Step, FRK-9)
 * only after explicit operator approval.
 *
 * Explainability is a hard requirement: every operational suggestion MUST
 * carry a `reason` explaining why it was produced.
 */

export type FrankSuggestionType = 'action' | 'info' | 'automation';

export type FrankSurface = 'queue' | 'active_context' | 'pulse';

export type FrankFeedbackOutcome = 'accepted' | 'rejected' | 'dismissed' | 'expired';

export interface FrankSuggestionAction {
  label: string;
  endpoint: string;
  /** Where the operator goes to act (GET = abrir/ler o alvo da ação; POST/PUT/DELETE = mutação que só ocorre sob aprovação explícita). */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: Record<string, unknown>;
}

export interface FrankSuggestion {
  id: string;
  tenantId: string;
  surface: FrankSurface;
  type: FrankSuggestionType;
  title: string;
  description: string;
  /** Mandatory explainability: why Frank produced this suggestion. */
  reason: string;
  /** 0..1 confidence; 0.75 is the default operator cutoff. */
  confidence: number;
  action?: FrankSuggestionAction;
  createdAt: string;
  expiresAt?: string | null;
}

export interface FrankSuggestionInput {
  surface: FrankSurface;
  type: FrankSuggestionType;
  title: string;
  description: string;
  reason: string | string[];
  confidence: number;
  action?: FrankSuggestionAction;
  expiresAt?: string | null;
}

export interface FrankFeedback {
  id: string;
  tenantId: string;
  suggestionId: string;
  outcome: FrankFeedbackOutcome;
  createdAt: string;
}

export interface FrankTenantPreferences {
  tenantId: string;
  /** Suggestion types the operator disabled entirely. */
  disabledTypes: FrankSuggestionType[];
  /** Confidence cutoff (0..1); suggestions below it are filtered out. */
  minConfidence: number;
}

export const DEFAULT_MIN_CONFIDENCE = 0.75;

export const SUGGESTION_TYPES: readonly FrankSuggestionType[] = ['action', 'info', 'automation'];

export const FEEDBACK_OUTCOMES: readonly FrankFeedbackOutcome[] = [
  'accepted',
  'rejected',
  'dismissed',
  'expired',
];

export function assertSuggestionType(value: string): FrankSuggestionType {
  if (!SUGGESTION_TYPES.includes(value as FrankSuggestionType)) {
    throw new RangeError(`invalid suggestion type: ${value}`);
  }
  return value as FrankSuggestionType;
}

export function assertSurface(value: string): FrankSurface {
  if (value !== 'queue' && value !== 'active_context' && value !== 'pulse') {
    throw new RangeError(`invalid Frank surface: ${value}`);
  }
  return value;
}

export function assertFeedbackOutcome(value: string): FrankFeedbackOutcome {
  if (!FEEDBACK_OUTCOMES.includes(value as FrankFeedbackOutcome)) {
    throw new RangeError(`invalid feedback outcome: ${value}`);
  }
  return value as FrankFeedbackOutcome;
}

export function assertConfidence(confidence: number): void {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new RangeError(`confidence must be within 0..1, got ${confidence}`);
  }
}

export function assertMinConfidence(minConfidence: number): void {
  if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 1) {
    throw new RangeError(`minConfidence must be within 0..1, got ${minConfidence}`);
  }
}

export function assertSuggestionInput(input: FrankSuggestionInput): void {
  if (!input.title || !input.description) {
    throw new RangeError('suggestion title and description are required');
  }
  if (!input.reason || (Array.isArray(input.reason) && input.reason.length === 0)) {
    throw new RangeError('suggestion reason is mandatory (explainability)');
  }
  assertConfidence(input.confidence);
}

/**
 * Builds a validated suggestion from input. Never mutates its arguments.
 * Returns a NEW object; the caller owns the id/timestamps.
 */
export function buildSuggestion(
  input: FrankSuggestionInput,
  args: { id: string; tenantId: string; createdAt?: string },
): FrankSuggestion {
  assertSuggestionType(input.type);
  assertSurface(input.surface);
  assertSuggestionInput(input);
  const reason = Array.isArray(input.reason) ? input.reason.join(' ') : input.reason;
  return {
    id: args.id,
    tenantId: args.tenantId,
    surface: input.surface,
    type: input.type,
    title: input.title,
    description: input.description,
    reason,
    confidence: input.confidence,
    action: input.action ? { ...input.action } : undefined,
    createdAt: args.createdAt ?? new Date().toISOString(),
    expiresAt: input.expiresAt ?? null,
  };
}

export function suggestionActionToPayload(
  suggestion: FrankSuggestion,
): { label: string; endpoint: string; method: string; payload?: unknown } | null {
  if (!suggestion.action) return null;
  return {
    label: suggestion.action.label,
    endpoint: suggestion.action.endpoint,
    method: suggestion.action.method,
    payload: suggestion.action.payload,
  };
}