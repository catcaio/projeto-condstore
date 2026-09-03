import { describe, it, expect } from 'vitest';
import { frankExecutionStateService } from '../frank-execution-state.service';
import { CONDSTORE_SYSTEM_KNOWLEDGE, getSystemKnowledgeContext } from '../frank-system-knowledge';

describe('Frank Execution State & Knowledge Layer', () => {
    const tenantId = 'tenant_test_123';

    it('should load system knowledge correctly', () => {
        expect(CONDSTORE_SYSTEM_KNOWLEDGE.atendimento).toBeDefined();
        expect(CONDSTORE_SYSTEM_KNOWLEDGE.frete.routes).toContain('/cockpit/freight-simulator');

        const context = getSystemKnowledgeContext('pedidos');
        expect(context).toContain('Gestão de Pedidos');
        expect(context).toContain('orders');
    });

    it('should create an execution run and add steps following valid state transitions', async () => {
        const run = await frankExecutionStateService.createRun({
            tenantId,
            title: 'Investigação de Falha de Cotação',
            autonomyLevel: 'EXECUTE_GUARDED',
            contextJson: { anomaly: 'low_quote_conversion' }
        });

        expect(run).toBeDefined();
        expect(run.executionId).toMatch(/^frk_exec_/);
        expect(run.status).toBe('PENDING');

        const step = await frankExecutionStateService.addStep({
            executionRunId: run.id,
            tenantId,
            stepNumber: 1,
            stepName: 'Analisar Logs de Tabela de Frete',
            actionType: 'READ_TELEMETRY',
            riskClass: 'SAFE',
            requiresHumanApproval: false,
        });

        expect(step).toBeDefined();
        expect(step.stepNumber).toBe(1);
        expect(step.status).toBe('PENDING');

        await frankExecutionStateService.updateStepCheckpoint(tenantId, step.id, 'COMPLETED', { result: 'Nenhum erro de tabela' });

        // Transition PENDING -> RUNNING -> COMPLETED
        await frankExecutionStateService.updateRunStatus(run.id, 'RUNNING', 'Iniciando Step 1');
        await frankExecutionStateService.updateRunStatus(run.id, 'COMPLETED', 'Step 1 Finalizado', { success: true });

        const executionData = await frankExecutionStateService.getExecutionWithSteps(tenantId, run.executionId);
        expect(executionData).not.toBeNull();
        expect(executionData?.run.status).toBe('COMPLETED');
        expect(executionData?.steps[0].status).toBe('COMPLETED');
    });

    it('should reject invalid state transitions', async () => {
        const run = await frankExecutionStateService.createRun({
            tenantId,
            title: 'Execução de Teste de Transição',
            autonomyLevel: 'OBSERVE',
        });

        // PENDING -> RUNNING -> COMPLETED
        await frankExecutionStateService.updateRunStatus(run.id, 'RUNNING');
        await frankExecutionStateService.updateRunStatus(run.id, 'COMPLETED');

        // Attempting COMPLETED -> RUNNING must fail
        await expect(
            frankExecutionStateService.updateRunStatus(run.id, 'RUNNING')
        ).rejects.toThrow('Invalid state transition from COMPLETED to RUNNING');
    });
});
