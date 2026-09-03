import { describe, it, expect } from 'vitest';
import { frankFactorySupervisionService } from '../frank-factory-supervision.service';
import { frankObserverService } from '../frank-observer.service';

describe('Frank ↔ Factory Supervision', () => {
    const tenantId = 'tenant_supervision_test';

    it('should review factory PR against diagnostic criteria', async () => {
        const executionId = await frankObserverService.observeSignal({
            tenantId,
            signalType: 'api_latency_spike',
            domain: 'cockpit',
            severity: 'HIGH',
            summary: 'Pico de latência nas rotas do Cockpit',
            evidence: { latencyMs: 2500 }
        });

        const review = await frankFactorySupervisionService.reviewFactoryPR({
            tenantId,
            executionId,
            prNumber: 42,
            prTitle: 'fix(cockpit): otimiza CTEs SQL para métricas',
            diffSummary: 'Adiciona filtro de data dentro de CTEs em cockpit-metrics-engine.ts',
            ciStatus: 'SUCCESS'
        });

        expect(review).toBeDefined();
        expect(review.prNumber).toBe(42);
        expect(review.ciPassed).toBe(true);
        expect(review.recommendation).toBe('APPROVE_AND_MERGE');
        expect(review.acceptanceCriteriaCheck.length).toBeGreaterThan(0);
    });
});
