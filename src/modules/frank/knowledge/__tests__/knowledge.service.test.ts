import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchKnowledgeForQuery, resolveKnowledge } from '../knowledge.service';
import * as repo from '../knowledge.repository';
import * as eventBus from '@/lib/events/operational-event-bus';
import type { FrankKnowledgeRecord } from '@/drizzle/schema';
import { randomUUID } from 'crypto';

vi.mock('../knowledge.repository', () => ({
    searchKnowledge: vi.fn(),
    createKnowledgeEntry: vi.fn(),
    updateKnowledgeEntry: vi.fn(),
    deleteKnowledgeEntry: vi.fn(),
    getKnowledgeById: vi.fn(),
    listKnowledge: vi.fn(),
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/infra/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const TENANT_A = randomUUID();
const TENANT_B = randomUUID();

function mockEntry(overrides: Partial<FrankKnowledgeRecord> = {}): FrankKnowledgeRecord {
    return {
        id: randomUUID(),
        tenantId: TENANT_A,
        title: 'FAQ Entry',
        content: 'Answer content',
        tags: ['faq'],
        source: 'manual',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('Frank Knowledge Service', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        // Restore return value after reset (needed for .catch() chaining)
        vi.mocked(eventBus.publishOperationalEvent).mockResolvedValue(undefined);
    });

    it('should return matching entries for a tenant query', async () => {
        const entries = [mockEntry({ title: 'Shipping FAQ' })];
        vi.mocked(repo.searchKnowledge).mockResolvedValueOnce(entries);

        const result = await searchKnowledgeForQuery(TENANT_A, 'shipping');

        expect(result.entries).toHaveLength(1);
        expect(result.query).toBe('shipping');
        expect(repo.searchKnowledge).toHaveBeenCalledWith(TENANT_A, 'shipping');
    });

    it('should return empty results for empty query', async () => {
        const result = await searchKnowledgeForQuery(TENANT_A, '');

        expect(result.entries).toHaveLength(0);
        expect(repo.searchKnowledge).not.toHaveBeenCalled();
    });

    it('should return empty results for different tenant (isolation)', async () => {
        vi.mocked(repo.searchKnowledge).mockResolvedValueOnce([]);

        const result = await searchKnowledgeForQuery(TENANT_B, 'frete');

        expect(result.entries).toHaveLength(0);
        expect(repo.searchKnowledge).toHaveBeenCalledWith(TENANT_B, 'frete');
    });

    it('should emit frank_knowledge_used event when resolving knowledge', async () => {
        const entry = mockEntry({ title: 'Prazo de Entrega' });
        vi.mocked(repo.searchKnowledge).mockResolvedValueOnce([entry]);

        const result = await resolveKnowledge(TENANT_A, 'prazo entrega', 'session-123');

        expect(result).not.toBeNull();
        expect(result?.id).toBe(entry.id);
        expect(eventBus.publishOperationalEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: TENANT_A,
                eventType: 'frank_knowledge_used',
                entityId: entry.id,
                sessionId: 'session-123',
            }),
        );
    });

    it('should return null when no knowledge matches', async () => {
        vi.mocked(repo.searchKnowledge).mockResolvedValueOnce([]);

        const result = await resolveKnowledge(TENANT_A, 'unknown topic', null);

        expect(result).toBeNull();
        expect(eventBus.publishOperationalEvent).not.toHaveBeenCalled();
    });
});
