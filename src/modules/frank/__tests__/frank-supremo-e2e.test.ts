import { describe, it, expect } from 'vitest';
import { frankObserverService } from '../frank-observer.service';
import { frankDiagnosisPipelineService } from '../frank-diagnosis-pipeline.service';
import { frankFactorySupervisionService } from '../frank-factory-supervision.service';
import { frankExecutionStateService } from '../frank-execution-state.service';

describe('Frank Supremo - End-to-End Operational Lifecycle', () => {
    const tenantId = 'tenant_e2e_supremo';

    it('should complete the full operational loop: DETECT → DIAGNOSE → HUMAN GATE → FACTORY SUPERVISION', async () => {
        // 1. DETECT (Observer captures critical signal)
        const signal = {
            tenantId,
            signalType: 'quote_to_order_conversion_drop',
            domain: 'frete',
            severity: 'CRITICAL' as const,
            summary: 'Queda acentuada na conversão de cotação para pedido em SP',
            evidence: { conversionRate: 0.05, periodDays: 7 }
        };

        const executionId = await frankObserverService.observeSignal(signal);
        expect(executionId).toBeDefined();

        // 2. DIAGNOSE (Frank correlates and prepares technical issue draft)
        const issueDraft = await frankDiagnosisPipelineService.diagnoseAndPrepareIssue(signal, executionId);
        expect(issueDraft.suggestedPriority).toBe('P0');
        expect(issueDraft.status).toBe('AWAITING_HUMAN_APPROVAL');

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

        // Finalize Execution Run
        await frankExecutionStateService.updateRunStatus(
            execution!.run.id,
            'COMPLETED',
            'Fluxo encerrado e monitoramento ativo pós-deploy',
            { prNumber: 108, success: true }
        );

        const finalExecution = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        expect(finalExecution?.run.status).toBe('COMPLETED');
    });
});
