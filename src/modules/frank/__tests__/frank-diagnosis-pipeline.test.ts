import { describe, it, expect } from 'vitest';
import { frankObserverService } from '../frank-observer.service';
import { frankDiagnosisPipelineService } from '../frank-diagnosis-pipeline.service';
import { frankExecutionStateService } from '../frank-execution-state.service';

describe('Frank Diagnosis & Issue Pipeline with Human Gate', () => {
    const tenantId = 'tenant_diag_test';

    it('should diagnose anomaly, prepare technical issue with evidence chain and enforce Human Gate', async () => {
        // 1. Capture Signal via Observer
        const signal = {
            tenantId,
            signalType: 'webhook_delivery_failure',
            domain: 'atendimento',
            severity: 'CRITICAL' as const,
            summary: 'Falha contínua no processamento de webhooks do Twilio',
            evidence: { errorCount: 15, route: '/api/whatsapp/incoming' },
            correlationKey: 'corr_webhook_failure_unique'
        };

        const executionId = await frankObserverService.observeSignal(signal);

        // 2. Run Diagnosis Pipeline
        const issueDraft = await frankDiagnosisPipelineService.diagnoseAndPrepareIssue(signal, executionId);

        expect(issueDraft).toBeDefined();
        expect(issueDraft.suggestedPriority).toBe('P0');
        expect(issueDraft.status).toBe('AWAITING_HUMAN_APPROVAL');
        expect(issueDraft.requiresHumanGate).toBe(true);

        // Verify Evidence Chain classification is HYPOTHESIS, not CONFIRMED_CAUSE
        expect(issueDraft.evidenceChain.classification).toBe('HYPOTHESIS');
        expect(issueDraft.evidenceChain.evidencesCollected.length).toBeGreaterThan(0);

        // 3. Verify Execution State is PAUSED for Human Approval
        const runBeforeApproval = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        expect(runBeforeApproval?.run.status).toBe('PAUSED_HUMAN_APPROVAL');

        // 4. Perform Human Approval
        const approved = await frankDiagnosisPipelineService.approveIssueForFactory(tenantId, executionId, 'user_supervisor_123');
        expect(approved.success).toBe(true);

        // 5. Verify Execution State resumed
        const runAfterApproval = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        expect(runAfterApproval?.run.status).toBe('RUNNING');
    });

    it('should distinguish HYPOTHESIS from CONFIRMED_CAUSE based on empirical proof', async () => {
        const signal = {
            tenantId,
            signalType: 'database_deadlock',
            domain: 'OPERATIONS',
            severity: 'HIGH' as const,
            summary: 'Deadlock detectado em transação de pedido',
            evidence: { query: 'UPDATE orders SET status = ...' }
        };

        // Without empirical proof -> HYPOTHESIS
        const unverified = await frankDiagnosisPipelineService.diagnoseAndPrepareIssue(signal);
        expect(unverified.evidenceChain.classification).toBe('HYPOTHESIS');

        // With empirical proof -> CONFIRMED_CAUSE
        const confirmed = await frankDiagnosisPipelineService.diagnoseAndPrepareIssue(signal, undefined, {
            confirmedCause: 'Lock timeout provocado por transação concorrente sem ordenação de chaves em update_order_status'
        });
        expect(confirmed.evidenceChain.classification).toBe('CONFIRMED_CAUSE');
        expect(confirmed.causalHypothesis).toContain('Lock timeout provocado');
    });
});
