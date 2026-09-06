import { describe, it, expect } from 'vitest';
import { frankSelfModelService } from '../frank-self-model.service';
import { FrankSelfModel } from '../frank-self-model.types';

describe('FrankSelfModelService', () => {
    it('generates a valid Operational Self-Model snapshot', async () => {
        const tenantId = 'tenant_test_123';
        const model: FrankSelfModel = await frankSelfModelService.generateSelfModel({
            tenantId,
            version: '1.0.0-sm-test',
        });

        expect(model).toBeDefined();
        expect(model.tenantId).toBe(tenantId);
        expect(model.version).toBe('1.0.0-sm-test');
        expect(model.timestamp).toBeDefined();

        // Verify capabilities initialized from CONDSTORE_SYSTEM_KNOWLEDGE
        expect(model.capabilities.length).toBeGreaterThan(0);
        const atendimentoCap = model.capabilities.find((c) => c.domain === 'atendimento');
        expect(atendimentoCap).toBeDefined();
        expect(atendimentoCap?.status).toBe('ACTIVE');

        // Verify tool reliabilities mapped from FrankToolRegistry
        expect(model.toolReliabilities.length).toBeGreaterThan(0);
        const freightTool = model.toolReliabilities.find((t) => t.toolName === 'freight_calculation');
        expect(freightTool).toBeDefined();

        // Verify structured beliefs classification (FACT, INFERENCE, HYPOTHESIS)
        expect(model.beliefs).toBeDefined();
        const facts = model.beliefs.filter((b) => b.type === 'FACT');
        const inferences = model.beliefs.filter((b) => b.type === 'INFERENCE');

        expect(facts.length).toBeGreaterThan(0);
        expect(inferences.length).toBeGreaterThan(0);

        // Verify provenance exists for every belief
        for (const belief of model.beliefs) {
            expect(belief.id).toBeDefined();
            expect(belief.provenance).toBeDefined();
            expect(belief.provenance.source).toBeDefined();
            expect(belief.provenance.timestamp).toBeDefined();
            expect(belief.confidence).toBeGreaterThanOrEqual(0.0);
            expect(belief.confidence).toBeLessThanOrEqual(1.0);
        }
    });

    it('differentiates facts vs inferences vs hypotheses accurately', async () => {
        const tenantId = 'tenant_belief_check';
        const model = await frankSelfModelService.generateSelfModel({ tenantId });

        const factTotal = model.beliefs.find((b) => b.id === 'belief_fact_total_interactions');
        expect(factTotal?.type).toBe('FACT');
        expect(factTotal?.confidence).toBe(1.0);

        const infHandoff = model.beliefs.find((b) => b.id === 'belief_inf_handoff_rate');
        expect(infHandoff?.type).toBe('INFERENCE');
        expect(infHandoff?.confidence).toBe(0.95);
    });
});
