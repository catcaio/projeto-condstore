import { describe, it, expect } from 'vitest';
import { frankObserverService } from '../frank-observer.service';
import { frankDiagnosisPipelineService } from '../frank-diagnosis-pipeline.service';
import { frankExecutionStateService } from '../frank-execution-state.service';

describe('Frank Diagnosis & Issue Pipeline with Human Gate', () => {
    const tenantId = 'tenant_diag_test';

    it('should diagnose anomaly, prepare technical issue and enforce Human Gate', async () => {
        // 1. Capture Signal via Observer
        const signal = {
            tenantId,
            signalType: 'webhook_delivery_failure',
            domain: 'atendimento',
            severity: 'CRITICAL' as const,
            summary: 'Falha contínua no processamento de webhooks do Twilio',
            evidence: { errorCount: 15, route: '/api/whatsapp/incoming' }
        };

        const executionId = await frankObserverService.observeSignal(signal);

        // 2. Run Diagnosis Pipeline
        const issueDraft = await frankDiagnosisPipelineService.diagnoseAndPrepareIssue(signal, executionId);

        expect(issueDraft).toBeDefined();
        expect(issueDraft.suggestedPriority).toBe('P0');
        expect(issueDraft.status).toBe('AWAITING_HUMAN_APPROVAL');
        expect(issueDraft.requiresHumanGate).toBe(true);

        // 3. Verify Execution State is PAUSED for Human Approval
        const runBeforeApproval = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        expect(runBeforeApproval?.run.status).toBe('PAUSED_HUMAN_APPROVAL');

        // 4. Perform Human Approval
        const approved = await frankDiagnosisPipelineService.approveIssueForFactory(tenantId, executionId, 'user_supervisor_123');
        expect(approved).toBe(true);

        // 5. Verify Execution State resumed
        const runAfterApproval = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        expect(runAfterApproval?.run.status).toBe('RUNNING');
    });
});
