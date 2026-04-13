import { structuredLogger } from '@/infra/log/logger';
import { tudicoRepository } from './tudico.repository';
import { seedPaperCards } from './tudico.seed';
import {
  auditInputSchema,
  createHypothesisVersionSchema,
  hypothesisVersionSchema,
  inconsistencyItemSchema,
  logInconsistencySchema,
  paperCardSchema,
  type EpistemicAuditResult,
  type HypothesisVersion,
  type InconsistencyItem,
  type PaperCard,
} from './tudico.types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function computeDiff(from: HypothesisVersion, to: HypothesisVersion) {
  const fromClaimMap = new Map(from.claims.map((claim) => [claim.id, claim]));
  const toClaimMap = new Map(to.claims.map((claim) => [claim.id, claim]));

  const added = to.claims.filter((claim) => !fromClaimMap.has(claim.id));
  const removed = from.claims.filter((claim) => !toClaimMap.has(claim.id));
  const changed = to.claims
    .filter((claim) => fromClaimMap.has(claim.id))
    .flatMap((claim) => {
      const previous = fromClaimMap.get(claim.id);
      if (!previous) return [];
      if (JSON.stringify(previous) === JSON.stringify(claim)) return [];
      return [{ from: previous, to: claim }];
    });

  return {
    fromVersion: from.version,
    toVersion: to.version,
    summaryChanged: from.summary !== to.summary,
    rationaleChanged: from.rationale !== to.rationale,
    added,
    removed,
    changed,
  };
}

function runEpistemicAudit(responseText: string, claimIds: string[]): EpistemicAuditResult {
  const lower = responseText.toLowerCase();
  const tokens = tokenize(responseText);
  const alerts: EpistemicAuditResult['alerts'] = [];

  if (/definitivo|prova final|inevitavelmente|sem\s+dúvida/.test(lower)) {
    alerts.push({
      code: 'inflated_language',
      message: 'Linguagem inflada detectada; prefira qualificação condicional e nível de evidência.',
      severity: 'medium',
    });
  }

  if (/é como|analogia|met[aá]fora/.test(lower) && /mecanismo|causa/.test(lower)) {
    alerts.push({
      code: 'analogy_as_mechanism',
      message: 'Analogia tratada como mecanismo físico sem ponte formal explícita.',
      severity: 'high',
    });
  }

  const confirmationTerms = tokens.filter((token) => ['confirmado', 'comprovado', 'prova'].includes(token)).length;
  if (confirmationTerms >= 2 && !/limita[cç][aã]o|incerteza|aberto/.test(lower)) {
    alerts.push({
      code: 'confirmation_bias',
      message: 'Viés de confirmação: alta assertividade sem seção de limitações ou incertezas.',
      severity: 'medium',
    });
  }

  if (/especula[cç][aã]o/.test(lower) && /evid[eê]ncia/.test(lower) && !/separad|bloco/.test(lower)) {
    alerts.push({
      code: 'mixed_epistemic_levels',
      message: 'Mistura de níveis epistemológicos sem segmentação explícita.',
      severity: 'high',
    });
  }

  const score = Math.max(0, 100 - alerts.length * 20);
  return { claimIds, alerts, score };
}

export class TudicoRuntimeService {
  async ensureSeedPaperCards(tenantId: string, actorId: string): Promise<void> {
    const existing = await tudicoRepository.listByPrefix<PaperCard>(tenantId, 'paper');
    if (existing.length > 0) return;

    await Promise.all(
      seedPaperCards.map((paper) => tudicoRepository.upsert(tenantId, 'paper', paper.id, paper, actorId)),
    );

    structuredLogger.info('tudico_seed_paper_cards_initialized', {
      eventType: 'tudico_seed_paper_cards_initialized',
      tenantId,
      total: seedPaperCards.length,
    });
  }

  async createHypothesisVersion(tenantId: string, actorId: string, payload: unknown): Promise<HypothesisVersion> {
    const parsed = createHypothesisVersionSchema.parse(payload);
    const versions = await this.listHypothesisVersions(tenantId);
    const latest = versions.at(-1);
    const version: HypothesisVersion = hypothesisVersionSchema.parse({
      id: crypto.randomUUID(),
      version: latest ? latest.version + 1 : 1,
      title: parsed.title,
      summary: parsed.summary,
      rationale: parsed.rationale,
      claims: parsed.claims,
      previousVersionId: latest?.id ?? null,
      createdBy: actorId,
      createdAt: new Date().toISOString(),
    });

    await tudicoRepository.upsert(tenantId, 'hypothesis', version.id, version, actorId);

    structuredLogger.info('tudico_hypothesis_version_created', {
      eventType: 'tudico_hypothesis_version_created',
      tenantId,
      version: version.version,
      hypothesisId: version.id,
      actorId,
    });

    return version;
  }

  async listHypothesisVersions(tenantId: string): Promise<HypothesisVersion[]> {
    const versions = await tudicoRepository.listByPrefix<HypothesisVersion>(tenantId, 'hypothesis');
    return versions.map((item) => hypothesisVersionSchema.parse(item)).sort((a, b) => a.version - b.version);
  }

  async compareHypothesisVersions(tenantId: string, fromId: string, toId: string) {
    const from = await tudicoRepository.getById<HypothesisVersion>(tenantId, 'hypothesis', fromId);
    const to = await tudicoRepository.getById<HypothesisVersion>(tenantId, 'hypothesis', toId);

    if (!from || !to) {
      throw new Error('Hypothesis versions not found for comparison');
    }

    return computeDiff(hypothesisVersionSchema.parse(from), hypothesisVersionSchema.parse(to));
  }

  async listPaperCards(tenantId: string, actorId: string): Promise<PaperCard[]> {
    await this.ensureSeedPaperCards(tenantId, actorId);
    const papers = await tudicoRepository.listByPrefix<PaperCard>(tenantId, 'paper');
    return papers.map((paper) => paperCardSchema.parse(paper));
  }

  async getPaperCard(tenantId: string, actorId: string, paperId: string): Promise<PaperCard | null> {
    await this.ensureSeedPaperCards(tenantId, actorId);
    const paper = await tudicoRepository.getById<PaperCard>(tenantId, 'paper', paperId);
    return paper ? paperCardSchema.parse(paper) : null;
  }

  async logInconsistency(tenantId: string, actorId: string, payload: unknown): Promise<InconsistencyItem> {
    const parsed = logInconsistencySchema.parse(payload);
    const inconsistency = inconsistencyItemSchema.parse({
      id: crypto.randomUUID(),
      claimId: parsed.claimId,
      paperId: parsed.paperId,
      title: parsed.title,
      description: parsed.description,
      status: 'open',
      severity: parsed.severity,
      openedAt: new Date().toISOString(),
      openedBy: actorId,
      resolution: null,
      resolvedAt: null,
    });

    await tudicoRepository.upsert(tenantId, 'inconsistency', inconsistency.id, inconsistency, actorId);

    structuredLogger.warn('tudico_inconsistency_logged', {
      eventType: 'tudico_inconsistency_logged',
      tenantId,
      inconsistencyId: inconsistency.id,
      claimId: inconsistency.claimId,
      paperId: inconsistency.paperId,
      severity: inconsistency.severity,
    });

    return inconsistency;
  }

  async listInconsistencies(tenantId: string): Promise<InconsistencyItem[]> {
    const items = await tudicoRepository.listByPrefix<InconsistencyItem>(tenantId, 'inconsistency');
    return items.map((item) => inconsistencyItemSchema.parse(item));
  }

  async listClaimConflicts(tenantId: string, claimId?: string): Promise<InconsistencyItem[]> {
    const items = await this.listInconsistencies(tenantId);
    return claimId ? items.filter((item) => item.claimId === claimId) : items;
  }

  async auditResponse(payload: unknown): Promise<EpistemicAuditResult> {
    const parsed = auditInputSchema.parse(payload);
    return runEpistemicAudit(parsed.responseText, parsed.claimIds);
  }

  async executeTool(
    tenantId: string,
    actorId: string,
    tool: 'audit_response' | 'log_inconsistency' | 'compare_hypothesis_versions' | 'list_paper_cards' | 'get_paper_card' | 'list_claim_conflicts',
    input: Record<string, unknown>,
  ): Promise<unknown> {
    switch (tool) {
      case 'audit_response':
        return this.auditResponse(input);
      case 'log_inconsistency':
        return this.logInconsistency(tenantId, actorId, input);
      case 'compare_hypothesis_versions':
        return this.compareHypothesisVersions(tenantId, String(input.fromId), String(input.toId));
      case 'list_paper_cards':
        return this.listPaperCards(tenantId, actorId);
      case 'get_paper_card':
        return this.getPaperCard(tenantId, actorId, String(input.paperId));
      case 'list_claim_conflicts':
        return this.listClaimConflicts(tenantId, input.claimId ? String(input.claimId) : undefined);
      default:
        throw new Error(`Unsupported tool: ${tool}`);
    }
  }
}

export const tudicoRuntimeService = new TudicoRuntimeService();
