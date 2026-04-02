import { ingestMasterDocument } from './master-doc-ingest';
import type { TudicoMemoryState } from './types';

const STORE = new Map<string, TudicoMemoryState>();

function createSeedState(masterSummary: string, masterTitle: string): TudicoMemoryState {
  return {
    masterDocument: {
      title: masterTitle,
      summary: masterSummary,
      sourcePath: 'docs/tudico/master-document.md',
      lastIngestedAt: new Date().toISOString(),
    },
    claims: [
      {
        id: 'claim-1',
        statement: 'Separar descrição efetiva de descrição fundamental evita colapso prematuro de modelo.',
        status: 'plausível',
        evidenceRefs: ['master:claims:1'],
      },
      {
        id: 'claim-2',
        statement: 'Transições de regime podem ser tratadas como mudanças de consistência entre constraints.',
        status: 'conjectural',
        evidenceRefs: ['master:claims:2'],
      },
    ],
    glossary: [
      {
        term: 'Regime',
        definition: 'Faixa de validade de uma descrição efetiva.',
        relatedTerms: ['Constraint'],
      },
      {
        term: 'Constraint',
        definition: 'Restrição estrutural sobre relações admissíveis.',
        relatedTerms: ['Invariância relacional'],
      },
    ],
    hypothesisVersions: [
      {
        id: 'hyp-0.1',
        version: '0.1',
        summary: 'Primeira formulação da hipótese relacional.',
        changes: ['Definição inicial de regime efetivo'],
        createdAt: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'hyp-0.2',
        version: '0.2',
        summary: 'Introduz condicionamento por escala e contorno.',
        changes: ['Separação explícita entre níveis efetivo/fundamental'],
        createdAt: '2026-04-02T00:00:00.000Z',
      },
    ],
    openQuestions: [
      {
        id: 'oq-1',
        question: 'Quais invariantes persistem entre regimes não lineares?',
        priority: 'high',
      },
      {
        id: 'oq-2',
        question: 'Como validar empiricamente transições entre constraints candidatas?',
        priority: 'medium',
      },
    ],
    bibliography: [
      {
        id: 'bib-1',
        citation: 'Rindler Working Notes v0.2',
        note: 'Documento base do MVP.',
      },
    ],
    inconsistencies: [
      {
        id: 'inc-1',
        description: 'Uso ambíguo do termo “fundamental” em notas paralelas.',
        severity: 'medium',
        relatedClaimIds: ['claim-1'],
        action: 'Padronizar definição no glossary e revisar claims relacionados.',
      },
    ],
  };
}

export async function getTudicoMemoryState(tenantId: string): Promise<TudicoMemoryState> {
  const existing = STORE.get(tenantId);
  if (existing) return existing;

  const ingested = await ingestMasterDocument();
  const seed = createSeedState(ingested.summary, ingested.title);
  seed.masterDocument = ingested;

  STORE.set(tenantId, seed);
  return seed;
}
