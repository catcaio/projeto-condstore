import type { TudicoMemoryState, TudicoToolName } from './types';

export type TudicoTool = (state: TudicoMemoryState, payload?: Record<string, unknown>) => unknown;

function getClaimStatus(state: TudicoMemoryState, payload?: Record<string, unknown>) {
  const claimId = typeof payload?.claimId === 'string' ? payload.claimId : null;
  if (!claimId) return state.claims;
  return state.claims.find((claim) => claim.id === claimId) ?? null;
}

function compareHypothesisVersions(state: TudicoMemoryState, payload?: Record<string, unknown>) {
  const fromVersion = typeof payload?.fromVersion === 'string' ? payload.fromVersion : state.hypothesisVersions[0]?.version;
  const toVersion = typeof payload?.toVersion === 'string' ? payload.toVersion : state.hypothesisVersions[state.hypothesisVersions.length - 1]?.version;

  const from = state.hypothesisVersions.find((item) => item.version === fromVersion);
  const to = state.hypothesisVersions.find((item) => item.version === toVersion);

  if (!from || !to) {
    return { fromVersion, toVersion, found: false };
  }

  const added = to.changes.filter((change) => !from.changes.includes(change));
  const removed = from.changes.filter((change) => !to.changes.includes(change));

  return {
    fromVersion: from.version,
    toVersion: to.version,
    added,
    removed,
    found: true,
  };
}

function fetchGlossaryTerm(state: TudicoMemoryState, payload?: Record<string, unknown>) {
  const term = typeof payload?.term === 'string' ? payload.term.toLowerCase() : '';
  return state.glossary.find((item) => item.term.toLowerCase() === term) ?? null;
}

function listOpenQuestions(state: TudicoMemoryState) {
  return state.openQuestions;
}

function auditResponseForExtrapolation(_: TudicoMemoryState, payload?: Record<string, unknown>) {
  const text = typeof payload?.text === 'string' ? payload.text : '';
  const riskMarkers = ['sempre', 'prova definitiva', 'garante', 'sem exceção'];
  const found = riskMarkers.filter((marker) => text.toLowerCase().includes(marker));

  return {
    riskLevel: found.length > 0 ? 'high' : 'low',
    markers: found,
    recommendation: found.length > 0
      ? 'Reduzir afirmações absolutas e classificar bloco como conjectural/excessivo quando aplicável.'
      : 'Sem extrapolação forte detectada por heurística mínima.',
  };
}

function mapConceptDependencies(state: TudicoMemoryState, payload?: Record<string, unknown>) {
  const term = typeof payload?.term === 'string' ? payload.term.toLowerCase() : '';
  const node = state.glossary.find((item) => item.term.toLowerCase() === term);
  if (!node) return { term: payload?.term ?? null, dependencies: [] };

  return {
    term: node.term,
    dependencies: node.relatedTerms,
  };
}

function summarizeRegimeState(state: TudicoMemoryState) {
  return {
    claims: state.claims.length,
    openQuestions: state.openQuestions.length,
    inconsistencies: state.inconsistencies.length,
    currentHypothesis: state.hypothesisVersions[state.hypothesisVersions.length - 1]?.version ?? 'n/a',
  };
}

export const tudicoToolsRegistry: Record<TudicoToolName, TudicoTool> = {
  get_claim_status: getClaimStatus,
  compare_hypothesis_versions: compareHypothesisVersions,
  fetch_glossary_term: fetchGlossaryTerm,
  list_open_questions: listOpenQuestions,
  audit_response_for_extrapolation: auditResponseForExtrapolation,
  map_concept_dependencies: mapConceptDependencies,
  summarize_regime_state: summarizeRegimeState,
};
