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
            evidence: { timeoutMs: 5000, carrier: 'melhor_envio' },
            correlationKey: 'corr_freight_timeout_unique_1'
        });

        expect(executionId).toBeDefined();
        expect(executionId).toMatch(/^frk_exec_/);

        const executionData = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        expect(executionData).not.toBeNull();
        expect(executionData?.run.title).toContain('freight_calculation_timeout');
        expect(executionData?.steps.length).toBe(1);
    });

    it('should deduplicate multiple identical signals into a single execution run', async () => {
        const signal = {
            tenantId,
            signalType: 'database_connection_spike',
            domain: 'OPERATIONS',
            severity: 'CRITICAL' as const,
            summary: 'Pico de conexões no banco de dados',
            evidence: { connections: 150 },
            correlationKey: 'corr_db_spike_unique'
        };

        const exec1 = await frankObserverService.observeSignal(signal);
        const exec2 = await frankObserverService.observeSignal(signal);

        expect(exec1).toBe(exec2); // Same execution ID returned for deduplicated incident
    });
});
