import { describe, it, expect } from 'vitest';
import { frankObserverService } from '../frank-observer.service';
import { frankDiagnosisPipelineService } from '../frank-diagnosis-pipeline.service';
import { frankFactorySupervisionService } from '../frank-factory-supervision.service';
import { frankExecutionStateService } from '../frank-execution-state.service';
import { frankPostDeployService } from '../frank-post-deploy.service';

describe('Frank Supremo - End-to-End Operational Lifecycle', () => {
    const tenantId = 'tenant_e2e_supremo';

    it('should complete the full operational loop: DETECT → DIAGNOSE → HUMAN GATE → FACTORY SUPERVISION → POST-DEPLOY VERIFICATION', async () => {
        // 1. DETECT (Observer captures critical signal)
        const signal = {
            tenantId,
            signalType: 'quote_to_order_conversion_drop',
            domain: 'frete',
            severity: 'CRITICAL' as const,
            summary: 'Queda acentuada na conversão de cotação para pedido em SP',
            evidence: { conversionRate: 0.05, periodDays: 7 },
            correlationKey: 'corr_quote_drop_e2e'
        };

        const executionId = await frankObserverService.observeSignal(signal);
        expect(executionId).toBeDefined();

        // 2. DIAGNOSE (Frank correlates and prepares technical issue draft with evidence chain)
        const issueDraft = await frankDiagnosisPipelineService.diagnoseAndPrepareIssue(signal, executionId);
        expect(issueDraft.suggestedPriority).toBe('P0');
        expect(issueDraft.status).toBe('AWAITING_HUMAN_APPROVAL');
        expect(issueDraft.evidenceChain.classification).toBe('HYPOTHESIS');

        // Verify run is paused at Human Gate
        let execution = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        expect(execution?.run.status).toBe('PAUSED_HUMAN_APPROVAL');

        // 3. HUMAN GATE (Human Supervisor approves issue for Factory)
        const approved = await frankDiagnosisPipelineService.approveIssueForFactory(tenantId, executionId, 'user_gestor_ops');
        expect(approved).toBe(true);

        execution = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        expect(execution?.run.status).toBe('RUNNING');

        // 4. FACTORY EXECUTION & SUPERVISION (Frank reviews PR submitted by Factory)
        const prReview = await frankFactorySupervisionService.reviewFactoryPR({
            tenantId,
            executionId,
            prNumber: 108,
            prTitle: 'fix(freight): ajusta margem e fallback para CEPs da capital',
            diffSummary: 'Corrige cálculo de margem e aplica fallback seguro para transportadoras em SP',
            ciStatus: 'SUCCESS'
        });

        expect(prReview.recommendation).toBe('APPROVE_AND_MERGE');
        expect(prReview.ciPassed).toBe(true);

        // 5. POST-DEPLOY OBSERVATION (Frank verifies metrics after deployment)
        const postDeployResult = await frankPostDeployService.verifyPostDeploy({
            tenantId,
            executionId,
            signalType: 'quote_to_order_conversion_drop',
            currentValue: 0.02, // Conversion drop below threshold = resolved
            expectedThreshold: 0.05
        });

        expect(postDeployResult.resolved).toBe(true);

        const finalExecution = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        expect(finalExecution?.run.status).toBe('COMPLETED');
    });
});
