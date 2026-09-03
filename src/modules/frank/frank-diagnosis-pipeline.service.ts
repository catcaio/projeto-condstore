import { frankExecutionStateService } from './frank-execution-state.service';
import { CONDSTORE_SYSTEM_KNOWLEDGE } from './frank-system-knowledge';
import { logger } from '@/infra/logger';

export interface SignalData {
    tenantId: string;
    signalType: string;
    domain: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    summary: string;
    evidence: Record<string, unknown>;
}

export type InvestigationClassification = 'OBSERVATION' | 'EVIDENCE' | 'INFERENCE' | 'HYPOTHESIS' | 'CONFIRMED_CAUSE';

export interface InvestigationEvidenceChain {
    observation: string;
    evidencesCollected: Array<{ source: string; detail: unknown; timestamp: Date }>;
    inferences: string[];
    causalHypothesis: string;
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
     * Runs the DETECT → CORRELATE → INVESTIGATE → CLASSIFY → DIAGNOSE → PROPOSE pipeline.
     */
    async diagnoseAndPrepareIssue(signal: SignalData, executionId?: string): Promise<TechnicalIssueDraft> {
        logger.info('Frank Diagnosis Pipeline started', { tenantId: signal.tenantId, signalType: signal.signalType });

        // 1. Correlate with system domain knowledge
        const domainKnowledge = CONDSTORE_SYSTEM_KNOWLEDGE[signal.domain.toLowerCase()] || {
            domain: signal.domain,
            routes: ['/'],
            tables: [],
            businessRules: []
        };

        // 2. Formulate Evidence Chain (Observation -> Evidence -> Inference -> Hypothesis)
        const evidenceChain: InvestigationEvidenceChain = {
            observation: signal.summary,
            evidencesCollected: [
                {
                    source: `operational_event_bus:${signal.signalType}`,
                    detail: signal.evidence,
                    timestamp: new Date()
                }
            ],
            inferences: [
                `Anomalia correlacionada ao domínio [${domainKnowledge.domain}]`,
                `Componentes afetados: ${domainKnowledge.routes.join(', ')}`
            ],
            causalHypothesis: `Hypothesis: ${signal.summary}. Potential root cause in services interacting with ${domainKnowledge.routes.join(', ')}.`,
            classification: 'HYPOTHESIS' // Rigorously distinct from CONFIRMED_CAUSE
        };

        // 3. Draft Technical Issue for Factory Software
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
            confidence: signal.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
            architecturalContext: `Arquitetura CONDSTORE OS. Tabelas envolvidas: ${domainKnowledge.tables.join(', ')}.`,
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

        // 4. Update execution checkpoint if executionId is present
        if (executionId) {
            const run = await frankExecutionStateService.getExecutionWithSteps(signal.tenantId, executionId);
            if (run) {
                const step = await frankExecutionStateService.addStep({
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
     * Approves an issue draft by Human Gate and marks it ready for Factory execution.
     */
    async approveIssueForFactory(tenantId: string, executionId: string, approvedBy: string): Promise<boolean> {
        const executionData = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        if (!executionData) return false;

        const awaitingStep = executionData.steps.find(s => s.status === 'AWAITING_APPROVAL' || s.requiresHumanApproval);
        if (awaitingStep) {
            await frankExecutionStateService.approveStep(tenantId, awaitingStep.id, approvedBy);
            await frankExecutionStateService.updateStepCheckpoint(tenantId, awaitingStep.id, 'COMPLETED', { approvedForFactory: true });
        }

        await frankExecutionStateService.updateRunStatus(
            executionData.run.id,
            'RUNNING',
            'Issue Aprovada - Aguardando Execução pela Factory'
        );

        logger.info('Frank Issue Draft approved for Factory dispatch', { tenantId, executionId, approvedBy });
        return true;
    }
}

export const frankDiagnosisPipelineService = new FrankDiagnosisPipelineService();
