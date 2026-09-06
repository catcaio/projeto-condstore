import { describe, it, expect, vi } from 'vitest';
import { frankSelfModelService } from '../frank-self-model.service';
import { FrankSelfModel } from '../frank-self-model.types';
import * as metricsModule from '../../frank-assist-metrics.service';

describe('FrankSelfModelService', () => {
    it('generates, persists, and retrieves versioned Operational Self-Model snapshots', async () => {
        const tenantId = 'tenant_persist_123';
        const version = '1.0.0-sm-persist';

        const model: FrankSelfModel = await frankSelfModelService.generateSelfModel({
            tenantId,
            version,
        });

        expect(model).toBeDefined();
        expect(model.tenantId).toBe(tenantId);
        expect(model.version).toBe(version);
        expect(['COMPLETE', 'UNAVAILABLE']).toContain(model.evidenceStatus);

        // Test persistent retrieval by version
        const retrieved = await frankSelfModelService.getSelfModel(tenantId, version);
        expect(retrieved).toBeDefined();
        expect(retrieved?.version).toBe(version);
        expect(retrieved?.tenantId).toBe(tenantId);

        // Test latest retrieval
        const latest = await frankSelfModelService.getLatestSelfModel(tenantId);
        expect(latest).toBeDefined();
        expect(latest?.version).toBe(version);
    });

    it('enforces tenant isolation when retrieving self-models', async () => {
        const tenantA = 'tenant_a_iso';
        const tenantB = 'tenant_b_iso';
        const version = '1.0.0-sm-iso';

        await frankSelfModelService.generateSelfModel({ tenantId: tenantA, version });

        const retrievedByB = await frankSelfModelService.getSelfModel(tenantB, version);
        expect(retrievedByB).toBeNull();

        const latestB = await frankSelfModelService.getLatestSelfModel(tenantB);
        expect(latestB).toBeNull();
    });

    it('handles telemetry collection errors gracefully without fabricating 100% success metrics', async () => {
        const tenantId = 'tenant_err_123';

        // Mock getFrankAssistMetrics to throw telemetry error
        const spy = vi.spyOn(metricsModule, 'getFrankAssistMetrics').mockRejectedValueOnce(
            new Error('Database connection failed')
        );

        const model = await frankSelfModelService.generateSelfModel({
            tenantId,
            version: '1.0.0-sm-err',
        });

        expect(model.evidenceStatus).toBe('UNAVAILABLE');
        expect(model.evidenceNotes).toBeDefined();
        expect(model.evidenceNotes?.[0]).toContain('Database connection failed');

        // Verify UNTESTED tools have null success rate, not 100.0%
        const untestedTool = model.toolReliabilities.find((t) => t.status === 'UNTESTED');
        expect(untestedTool).toBeDefined();
        expect(untestedTool?.successRate).toBeNull();
        expect(untestedTool?.errorRate).toBeNull();
        expect(untestedTool?.lastExecutedAt).toBeNull();

        // Verify FACT belief states evidence unavailable explicitly
        const unavailFact = model.beliefs.find((b) => b.id === 'belief_fact_evidence_unavailable');
        expect(unavailFact).toBeDefined();
        expect(unavailFact?.type).toBe('FACT');

        spy.mockRestore();
    });

    it('correctly formats changeHistory as INITIALIZATION baseline without fake observed effects', async () => {
        const tenantId = 'tenant_chg_123';
        const model = await frankSelfModelService.generateSelfModel({ tenantId, version: '1.0.0-sm-chg' });

        expect(model.changeHistory).toBeDefined();
        expect(model.changeHistory[0].changeType).toBe('INITIALIZATION');
        expect(model.changeHistory[0].observedEffects[0].verdict).toBe('BASELINE');
    });
});
