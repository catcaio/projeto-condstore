import { describe, it, expect } from 'vitest';
import { frankObserverService } from '../frank-observer.service';
import { frankExecutionStateService } from '../frank-execution-state.service';

describe('Frank Observer & Telemetry Pipeline', () => {
    const tenantId = 'tenant_obs_test';

    it('should capture signal and initiate an execution run', async () => {
        const executionId = await frankObserverService.observeSignal({
            tenantId,
            signalType: 'freight_calculation_timeout',
            domain: 'FREIGHT',
            severity: 'HIGH',
            summary: 'Timeout em cotações da transportadora Melhor Envio',
            evidence: { timeoutMs: 5000, carrier: 'melhor_envio' }
        });

        expect(executionId).toBeDefined();
        expect(executionId).toMatch(/^frk_exec_/);

        const executionData = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        expect(executionData).not.toBeNull();
        expect(executionData?.run.title).toContain('freight_calculation_timeout');
        expect(executionData?.steps.length).toBe(1);
        expect(executionData?.steps[0].stepName).toContain('Consolidar Evidências');
    });
});
