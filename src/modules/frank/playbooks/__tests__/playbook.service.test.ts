import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePlaybook } from '../playbook.service';
import * as repo from '../playbook.repository';
import type { FrankPlaybookRecord } from '@/drizzle/schema';
import { randomUUID } from 'crypto';

vi.mock('../playbook.repository', () => ({
    findApprovedPlaybooksForIntent: vi.fn(),
}));

const TEST_TENANT_ID = randomUUID();

function mockPlaybook(overrides: Partial<FrankPlaybookRecord>): FrankPlaybookRecord {
    return {
        id: randomUUID(),
        tenantId: TEST_TENANT_ID,
        title: 'Mock PB',
        intent: 'OUTRO',
        triggerPhrases: [],
        relatedEntities: [],
        responseBase: 'Base',
        responseShort: null,
        nextStepSuggestion: null,
        requiresConfirmation: false,
        requiresHumanHandoff: false,
        handoffConditions: null,
        tags: [],
        status: 'approved',
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('Frank Playbook Service', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should return null if no approved playbooks exist', async () => {
        vi.mocked(repo.findApprovedPlaybooksForIntent).mockResolvedValueOnce([]);

        const result = await resolvePlaybook({
            tenantId: TEST_TENANT_ID,
            intent: 'OUTRO',
            entities: { product: null, quantity: null, volume: null, orderId: null, documentType: null },
        });

        expect(result).toBeNull();
    });

    it('should return a playbook that has no relatedEntities requirement', async () => {
        vi.mocked(repo.findApprovedPlaybooksForIntent).mockResolvedValueOnce([
            mockPlaybook({ responseBase: 'No rules needed' }),
        ]);

        const result = await resolvePlaybook({
            tenantId: TEST_TENANT_ID,
            intent: 'OUTRO',
            entities: { product: null, quantity: null, volume: null, orderId: null, documentType: null },
        });

        expect(result).not.toBeNull();
        expect(result?.responseBase).toBe('No rules needed');
    });

    it('should pass matching relatedEntities playbook', async () => {
        vi.mocked(repo.findApprovedPlaybooksForIntent).mockResolvedValueOnce([
            mockPlaybook({ relatedEntities: ['product', 'quantity'], responseBase: 'Require prod+quant' }),
        ]);

        const result = await resolvePlaybook({
            tenantId: TEST_TENANT_ID,
            intent: 'PRODUTO',
            entities: { product: 'Cadeira', quantity: 5, volume: null, orderId: null, documentType: null },
        });

        expect(result).not.toBeNull();
        expect(result?.responseBase).toBe('Require prod+quant');
    });

    it('should skip playbook if required entities are missing in message', async () => {
        vi.mocked(repo.findApprovedPlaybooksForIntent).mockResolvedValueOnce([
            mockPlaybook({ relatedEntities: ['product', 'quantity'], responseBase: 'Require prod+quant' }), // Skipped
            mockPlaybook({ relatedEntities: ['product'], responseBase: 'Require only prod' }), // Matched
        ]);

        const result = await resolvePlaybook({
            tenantId: TEST_TENANT_ID,
            intent: 'PRODUTO',
            entities: { product: 'Cadeira', quantity: null, volume: null, orderId: null, documentType: null },
        });

        expect(result).not.toBeNull();
        expect(result?.responseBase).toBe('Require only prod'); // Falls back to next matched priority
    });

    it('should parse human handoff and confirmation flags', async () => {
        vi.mocked(repo.findApprovedPlaybooksForIntent).mockResolvedValueOnce([
            mockPlaybook({ requiresHumanHandoff: true, requiresConfirmation: true }),
        ]);

        const result = await resolvePlaybook({
            tenantId: TEST_TENANT_ID,
            intent: 'OUTRO',
            entities: { product: null, quantity: null, volume: null, orderId: null, documentType: null },
        });

        expect(result).not.toBeNull();
        expect(result?.requiresHumanHandoff).toBe(true);
        expect(result?.requiresConfirmation).toBe(true);
    });
});
