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
  statisticalValidationInputSchema,
  type EpistemicAuditResult,
  type HypothesisVersion,
  type InconsistencyItem,
  type PaperCard,
  type StatisticalValidationResult,
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

function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  const erf = sign * y;
  return (1 + erf) / 2;
}

function inverseNormalCdf(probability: number): number {
  // Peter John Acklam approximation.
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.38357751867269e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (probability <= 0 || probability >= 1) throw new Error('Probability must be between 0 and 1');

  if (probability < pLow) {
    const q = Math.sqrt(-2 * Math.log(probability));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (probability > pHigh) {
    const q = Math.sqrt(-2 * Math.log(1 - probability));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  const q = probability - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function runStatisticalValidation(payload: unknown): StatisticalValidationResult {
  const parsed = statisticalValidationInputSchema.parse(payload);
  const {
    controlSuccesses,
    controlTotal,
    treatmentSuccesses,
    treatmentTotal,
    confidenceLevel,
    alternative,
  } = parsed;

  if (controlSuccesses > controlTotal) throw new Error('controlSuccesses cannot be greater than controlTotal');
  if (treatmentSuccesses > treatmentTotal) throw new Error('treatmentSuccesses cannot be greater than treatmentTotal');

  const controlRate = controlSuccesses / controlTotal;
  const treatmentRate = treatmentSuccesses / treatmentTotal;
  const absoluteDelta = treatmentRate - controlRate;
  const relativeLift = controlRate === 0 ? null : absoluteDelta / controlRate;

  const pooled = (controlSuccesses + treatmentSuccesses) / (controlTotal + treatmentTotal);
  const pooledVariance = pooled * (1 - pooled) * (1 / controlTotal + 1 / treatmentTotal);
  const zScore = pooledVariance === 0 ? 0 : absoluteDelta / Math.sqrt(pooledVariance);

  let pValue = 1;
  if (alternative === 'two-sided') pValue = 2 * (1 - normalCdf(Math.abs(zScore)));
  if (alternative === 'greater') pValue = 1 - normalCdf(zScore);
  if (alternative === 'less') pValue = normalCdf(zScore);

  const alpha = 1 - confidenceLevel;
  const zCritical = inverseNormalCdf(1 - alpha / 2);
  const unpooledVariance = (controlRate * (1 - controlRate)) / controlTotal + (treatmentRate * (1 - treatmentRate)) / treatmentTotal;
  const margin = zCritical * Math.sqrt(unpooledVariance);
  const confidenceInterval = {
    lower: absoluteDelta - margin,
    upper: absoluteDelta + margin,
  };

  return {
    controlRate,
    treatmentRate,
    absoluteDelta,
    relativeLift,
    zScore,
    pValue,
    confidenceLevel,
    confidenceInterval,
    isSignificant: pValue < alpha,
  };
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

  async validateStatisticalSignal(payload: unknown): Promise<StatisticalValidationResult> {
    return runStatisticalValidation(payload);
  }

  async executeTool(
    tenantId: string,
    actorId: string,
    tool:
      | 'audit_response'
      | 'log_inconsistency'
      | 'compare_hypothesis_versions'
      | 'list_paper_cards'
      | 'get_paper_card'
      | 'list_claim_conflicts'
      | 'validate_statistical_signal',
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
      case 'validate_statistical_signal':
        return this.validateStatisticalSignal(input);
      default:
        throw new Error(`Unsupported tool: ${tool}`);
    }
  }
}

export const tudicoRuntimeService = new TudicoRuntimeService();
