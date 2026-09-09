/**
 * FRK-8/008 — Deterministic thread priority scoring.
 *
 * The queue score is EXPLAINABLE by construction: every factor contributes
 * a named reason, so the operator can see exactly why a thread ranked high.
 * No LLM is involved in the scoring path (the model decision: deterministic
 * rules first, LLM enrichment later and asynchronously).
 */

export interface ThreadPriorityFactors {
  /** e.g. prospect / negotiation / active-order / logistics-problem (0..1). */
  threadTypeWeight: number;
  /** e.g. new / in-progress / blocked / exception / done (0..1). */
  stateWeight: number;
  /** SLA pressure 0..1 (1 = about to breach; 0 = far from deadline). */
  slaRisk: number;
  /** financial impact 0..1 (1 = high-value quote/order). */
  financialImpact: number;
  /** idle time 0..1 (1 = stopped for a long time). */
  idleTime: number;
  /** historical similarity signal 0..1 (optional). */
  historicalSignal: number;
}

export interface PriorityScoreResult {
  /** Weighted score clamped to 0..100 (integer). */
  score: number;
  /** Human-readable reasons for each factor (explainability). */
  reasons: string[];
}

const DEFAULT_WEIGHTS = {
  threadType: 0.2,
  state: 0.2,
  sla: 0.25,
  financial: 0.2,
  idle: 0.1,
  historical: 0.05,
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function describeFactor(label: string, value: number): string {
  const pct = Math.round(clamp01(value) * 100);
  return `${label} (${pct}%)`;
}

/**
 * Pure scoring: same inputs always produce the same score and reasons.
 * Weights sum to 1.0 across the six factors.
 */
export function computeThreadPriorityScore(
  factors: ThreadPriorityFactors,
  weights: Partial<typeof DEFAULT_WEIGHTS> = {},
): PriorityScoreResult {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const weighted =
    clamp01(factors.threadTypeWeight) * w.threadType +
    clamp01(factors.stateWeight) * w.state +
    clamp01(factors.slaRisk) * w.sla +
    clamp01(factors.financialImpact) * w.financial +
    clamp01(factors.idleTime) * w.idle +
    clamp01(factors.historicalSignal) * w.historical;

  const score = Math.round(weighted * 100);

  const reasons: string[] = [];
  if (factors.slaRisk > 0.6) reasons.push(`SLA vence em breve (risco ${Math.round(factors.slaRisk * 100)}%)`);
  if (factors.idleTime > 0.6) reasons.push(`thread parada (tempo parado ${Math.round(factors.idleTime * 100)}%)`);
  if (factors.financialImpact > 0.6) reasons.push(`impacto financeiro alto (${Math.round(factors.financialImpact * 100)}%)`);
  if (factors.threadTypeWeight > 0.6) reasons.push(describeFactor('tipo de thread prioritário', factors.threadTypeWeight));
  if (factors.stateWeight > 0.6) reasons.push(describeFactor('estado exige atenção', factors.stateWeight));
  if (factors.historicalSignal > 0.6) reasons.push(describeFactor('sinal de histórico similar', factors.historicalSignal));
  if (reasons.length === 0) reasons.push('nenhum fator crítico detectado');

  return { score, reasons };
}