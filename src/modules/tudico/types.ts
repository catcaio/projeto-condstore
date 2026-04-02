export type TudicoEpistemicLabel = 'estabelecido' | 'plausível' | 'conjectural' | 'excessivo';

export interface TudicoMasterDocument {
  title: string;
  summary: string;
  sourcePath: string;
  lastIngestedAt: string;
}

export interface TudicoGlossaryTerm {
  term: string;
  definition: string;
  relatedTerms: string[];
}

export interface TudicoClaim {
  id: string;
  statement: string;
  status: TudicoEpistemicLabel;
  evidenceRefs: string[];
  notes?: string;
}

export interface TudicoHypothesisVersion {
  id: string;
  version: string;
  summary: string;
  changes: string[];
  createdAt: string;
}

export interface TudicoOpenQuestion {
  id: string;
  question: string;
  priority: 'low' | 'medium' | 'high';
}

export interface TudicoBibliographyItem {
  id: string;
  citation: string;
  note?: string;
}

export interface TudicoInconsistency {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  relatedClaimIds: string[];
  action: string;
}

export interface TudicoMemoryState {
  masterDocument: TudicoMasterDocument;
  glossary: TudicoGlossaryTerm[];
  claims: TudicoClaim[];
  hypothesisVersions: TudicoHypothesisVersion[];
  openQuestions: TudicoOpenQuestion[];
  bibliography: TudicoBibliographyItem[];
  inconsistencies: TudicoInconsistency[];
}

export type TudicoToolName =
  | 'get_claim_status'
  | 'compare_hypothesis_versions'
  | 'fetch_glossary_term'
  | 'list_open_questions'
  | 'audit_response_for_extrapolation'
  | 'map_concept_dependencies'
  | 'summarize_regime_state';

export interface TudicoQueryInput {
  tenantId: string;
  query: string;
  tool?: TudicoToolName;
  payload?: Record<string, unknown>;
}

export interface TudicoEpistemicBlock {
  label: TudicoEpistemicLabel;
  content: string;
}

export interface TudicoResponse {
  protocol: {
    baseEstabelecida: string;
    leituraHipoteseAtual: string;
    auditoriaCritica: string;
  };
  epistemicBlocks: TudicoEpistemicBlock[];
  toolResult?: unknown;
  warnings: string[];
}
