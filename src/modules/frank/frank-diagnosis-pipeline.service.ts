import { frankExecutionStateService } from './frank-execution-state.service';
import { CONDSTORE_SYSTEM_KNOWLEDGE } from './frank-system-knowledge';
import { getDb } from '@/infra/db';
import { operationalEvents, adminAuditLog } from '@/drizzle/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { logger } from '@/infra/logger';

export interface SignalData {
    tenantId: string;
    signalType: string;
    domain: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    summary: string;
    evidence: Record<string, unknown>;
    requestId?: string;
    traceId?: string;
}

export type InvestigationClassification = 'OBSERVATION' | 'EVIDENCE' | 'INFERENCE' | 'HYPOTHESIS' | 'CONFIRMED_CAUSE';

export interface EvidenceItem {
    source: 'event_bus' | 'structured_log' | 'metric' | 'database_state' | 'deploy_commit' | 'trace_id';
    detail: unknown;
    timestamp: Date;
}

export interface InvestigationEvidenceChain {
    observation: string;
    evidencesCollected: EvidenceItem[];
    inferences: string[];
    causalHypothesis: string;
    confirmedCause?: string | null;
    classification: InvestigationClassification;
}

export interface TechnicalIssueDraft {
    title: string;
    suggestedPriority: 'P0' | 'P1' | 'P2' | 'P3';
    summary: string;
    impact: string;
    affectedComponents: string[];
    evidenceChain: InvestigationEvidenceChain;
    causalHypothesis: string;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    architecturalContext: string;
    acceptanceCriteria: string[];
    doNotChange: string[];
    requiresHumanGate: boolean;
    status: 'DRAFT_PROPOSED' | 'AWAITING_HUMAN_APPROVAL' | 'APPROVED_FOR_FACTORY' | 'REJECTED';
}

export class FrankDiagnosisPipelineService {
    /**
     * Collects multi-dimensional evidence across operational logs, database state, metrics, trace IDs, and recent GitHub commits.
     */
    async collectMultiDimensionalEvidence(signal: SignalData): Promise<EvidenceItem[]> {
        const items: EvidenceItem[] = [];
        const now = new Date();

        // 1. Signal Event Bus Evidence
        items.push({
            source: 'event_bus',
            detail: { signalType: signal.signalType, domain: signal.domain, evidence: signal.evidence },
            timestamp: now,
        });

        // 2. Trace / Request ID Evidence
        if (signal.requestId || signal.traceId || signal.evidence.requestId) {
            items.push({
                source: 'trace_id',
                detail: { requestId: signal.requestId || signal.evidence.requestId, traceId: signal.traceId },
                timestamp: now,
            });
        }

        // 3. Database State & Operational Audit Logs
        try {
            const db = await getDb();
            if (db) {
                const since = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes back
                const logs = await db.select().from(adminAuditLog)
                    .where(and(eq(adminAuditLog.tenantId, signal.tenantId), gte(adminAuditLog.createdAt, since)))
                    .orderBy(desc(adminAuditLog.createdAt))
                    .limit(5);

                if (logs.length > 0) {
                    items.push({
                        source: 'structured_log',
                        detail: logs.map(l => ({ action: l.action, actor: l.userId, createdAt: l.createdAt })),
                        timestamp: now,
                    });
                }
            }
        } catch {
            // DB logging error ignored in evidence collection fallback
        }

        // 4. Metric Context
        if (typeof signal.evidence.latencyMs === 'number' || typeof signal.evidence.errorRate === 'number') {
            items.push({
                source: 'metric',
                detail: { latencyMs: signal.evidence.latencyMs, errorRate: signal.evidence.errorRate },
                timestamp: now,
            });
        }

        // 5. Deploy / Commit Context
        try {
            const githubToken = process.env.GITHUB_TOKEN;
            const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
            if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

            const res = await fetch('https://api.github.com/repos/catcaio/projeto-condstore/commits?per_page=3', {
                headers,
                next: { revalidate: 300 }
            });

            if (res.ok) {
                const commits = await res.json();
                if (Array.isArray(commits) && commits.length > 0) {
                    items.push({
                        source: 'deploy_commit',
                        detail: commits.map(c => ({
                            sha: c.sha?.substring(0, 7),
                            message: c.commit?.message,
                            author: c.commit?.author?.name,
                            date: c.commit?.author?.date
                        })),
                        timestamp: now,
                    });
                }
            }
        } catch {
            // GitHub fetch fallback
        }

        return items;
    }

    /**
     * Classifies the investigation state with zero false-certainty (HYPOTHESIS vs CONFIRMED_CAUSE).
     */
    classifyInvestigation(evidence: EvidenceItem[], hasEmpiricalProof: boolean = false): InvestigationClassification {
        if (hasEmpiricalProof) {
            return 'CONFIRMED_CAUSE';
        }
        if (evidence.length >= 2) {
            return 'HYPOTHESIS';
        }
        if (evidence.length === 1) {
            return 'EVIDENCE';
        }
        return 'OBSERVATION';
    }

    /**
     * Runs the DETECT → CORRELATE → COLLECT EVIDENCE → INVESTIGATE → CLASSIFY → DIAGNOSE → CONFIDENCE → PROPOSE pipeline.
     */
    async diagnoseAndPrepareIssue(signal: SignalData, executionId?: string, empiricalProof?: { confirmedCause: string }): Promise<TechnicalIssueDraft> {
        logger.info('Frank Diagnosis Pipeline started', { tenantId: signal.tenantId, signalType: signal.signalType });

        // 1. Correlate with system domain knowledge
        const domainKnowledge = CONDSTORE_SYSTEM_KNOWLEDGE[signal.domain.toLowerCase()] || {
            domain: signal.domain,
            routes: ['/'],
            tables: [],
            businessRules: []
        };

        // 2. Collect Multi-dimensional Evidence
        const evidencesCollected = await this.collectMultiDimensionalEvidence(signal);

        // 3. Classify Investigation (Never present hypothesis as confirmed cause without empirical proof)
        const classification = this.classifyInvestigation(evidencesCollected, !!empiricalProof?.confirmedCause);

        const inferences = [
            `Anomalia correlacionada ao domínio [${domainKnowledge.domain}]`,
            `Rotas/endpoints investigados: ${domainKnowledge.routes.join(', ')}`,
            `Tabelas de banco sob análise: ${domainKnowledge.tables.join(', ') || 'Nenhuma table mapeada'}`,
        ];

        const causalHypothesis = empiricalProof?.confirmedCause
            ? `Causa Confirmada: ${empiricalProof.confirmedCause}`
            : `Hipótese Causal: Anomalia [${signal.signalType}] em serviços de [${domainKnowledge.domain}]. Causa potencial em interações de ${domainKnowledge.routes.join(', ')}.`;

        const evidenceChain: InvestigationEvidenceChain = {
            observation: signal.summary,
            evidencesCollected,
            inferences,
            causalHypothesis,
            confirmedCause: empiricalProof?.confirmedCause || null,
            classification, // Rigorously distinct: 'HYPOTHESIS' unless empiricalProof is explicitly provided
        };

        // 4. Draft Technical Issue for Factory Software
        const priorityMap: Record<string, 'P0' | 'P1' | 'P2' | 'P3'> = {
            CRITICAL: 'P0',
            HIGH: 'P1',
            MEDIUM: 'P2',
            LOW: 'P3'
        };

        const issueDraft: TechnicalIssueDraft = {
            title: `[Frank Diagnostic] ${signal.summary}`,
            suggestedPriority: priorityMap[signal.severity] || 'P2',
            summary: signal.summary,
            impact: `Possível degradação operacional no domínio ${domainKnowledge.domain}.`,
            affectedComponents: domainKnowledge.routes,
            evidenceChain,
            causalHypothesis: evidenceChain.causalHypothesis,
            confidence: empiricalProof?.confirmedCause ? 'HIGH' : signal.severity === 'CRITICAL' ? 'MEDIUM' : 'LOW',
            architecturalContext: `Arquitetura CONDSTORE OS. Domínio: ${domainKnowledge.domain}. Tabelas envolvidas: ${domainKnowledge.tables.join(', ') || 'N/A'}.`,
            acceptanceCriteria: [
                `Corrigir causa raiz associada ao evento ${signal.signalType}`,
                `Validar funcionamento sem regressões em ${domainKnowledge.routes[0] || 'rotas afetadas'}`,
                'Passar nos testes automatizados e guardrails do projeto'
            ],
            doNotChange: [
                'Invariantes de isolamento multi-tenant (tenantId)',
                'Human Gate em operações críticas'
            ],
            requiresHumanGate: true, // Always enforce human gate before dispatching to Factory
            status: 'AWAITING_HUMAN_APPROVAL'
        };

        // 5. Update execution checkpoint if executionId is present
        if (executionId) {
            const run = await frankExecutionStateService.getExecutionWithSteps(signal.tenantId, executionId);
            if (run) {
                await frankExecutionStateService.addStep({
                    executionRunId: run.run.id,
                    tenantId: signal.tenantId,
                    stepNumber: 2,
                    stepName: 'Gerar Minuta de Issue Técnica para Factory',
                    actionType: 'PROPOSE_FACTORY_ISSUE',
                    riskClass: 'GUARDED',
                    requiresHumanApproval: true,
                    inputPayload: issueDraft as any
                });

                await frankExecutionStateService.updateRunStatus(
                    run.run.id,
                    'PAUSED_HUMAN_APPROVAL',
                    'Aguardando Aprovação Humana para Envio à Factory',
                    { issueDraft }
                );
            }
        }

        return issueDraft;
    }

    /**
     * Approves an issue draft by Human Gate, dispatches to Factory / GitHub, and marks execution RUNNING.
     */
    async approveIssueForFactory(tenantId: string, executionId: string, approvedBy: string): Promise<{ success: boolean; githubIssueUrl?: string }> {
        const executionData = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        if (!executionData) return { success: false };

        const awaitingStep = executionData.steps.find(s => s.status === 'AWAITING_APPROVAL' || s.requiresHumanApproval);
        if (awaitingStep) {
            await frankExecutionStateService.approveStep(tenantId, awaitingStep.id, approvedBy);
            await frankExecutionStateService.updateStepCheckpoint(tenantId, awaitingStep.id, 'COMPLETED', { approvedForFactory: true });
        }

        // Optional GitHub Issue creation if token present
        let githubIssueUrl: string | undefined;
        try {
            const githubToken = process.env.GITHUB_TOKEN;
            if (githubToken) {
                const issueDraft = (executionData.run.resultJson as any)?.issueDraft as TechnicalIssueDraft;
                const res = await fetch('https://api.github.com/repos/catcaio/projeto-condstore/issues', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${githubToken}`,
                        Accept: 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: issueDraft?.title || executionData.run.title,
                        body: `## Technical Issue Draft (Frank Supremo Supervision)
**Execution ID:** \`${executionId}\`
**Tenant ID:** \`${tenantId}\`
**Priority:** ${issueDraft?.suggestedPriority || 'P2'}
**Impact:** ${issueDraft?.impact || 'Operational degradation'}
**Affected Components:** ${(issueDraft?.affectedComponents || []).join(', ')}

### Hypothesis / Confirmed Cause
${issueDraft?.causalHypothesis || 'N/A'}

### Acceptance Criteria
${(issueDraft?.acceptanceCriteria || []).map(c => `- [ ] ${c}`).join('\n')}
`,
                        labels: ['bug', 'frank-supremo', 'factory']
                    })
                });

                if (res.ok) {
                    const created = await res.json();
                    githubIssueUrl = created.html_url;
                }
            }
        } catch {
            // Non-blocking GitHub dispatch fallback
        }

        await frankExecutionStateService.updateRunStatus(
            executionData.run.id,
            'RUNNING',
            'Issue Aprovada - Aguardando Execução pela Factory',
            { githubIssueUrl }
        );

        logger.info('Frank Issue Draft approved for Factory dispatch', { tenantId, executionId, approvedBy, githubIssueUrl });
        return { success: true, githubIssueUrl };
    }
}

export const frankDiagnosisPipelineService = new FrankDiagnosisPipelineService();
