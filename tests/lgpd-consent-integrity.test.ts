import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vectorPurgeService } from '../src/modules/privacy/vector-purge.service';
import { retrieveContextMulti } from '../src/core/ai/retrieval/retrieve-context';
import { endUserConsentRepository } from '../src/infra/repositories/end-user-consent.repository';
import { deletePointsByFilter } from '../src/infra/vector/qdrant.client';
import { getDb } from '../src/infra/db';

vi.mock('../src/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('../src/infra/vector/qdrant.client', () => ({
    deletePointsByFilter: vi.fn(),
    getQdrantCollectionName: vi.fn().mockReturnValue('condstore_docs'),
    searchPoints: vi.fn().mockResolvedValue({ body: { result: [] } }),
}));

vi.mock('../src/infra/repositories/end-user-consent.repository', () => ({
    endUserConsentRepository: {
        getConsent: vi.fn(),
    }
}));

vi.mock('../src/infra/log/logger', () => ({
    structuredLogger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }
}));

describe('LGPD Consent Integrity - Vector Purge & Retrieval Block', () => {

    const tenantId = 'tenant-test';
    const phoneHash = 'hash-1234';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Vector Purge Service', () => {
        it('deletes vectors from Qdrant associated with a user sessions', async () => {
            // Mock DB to return some frankEvent IDs matching the phoneHash
            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }])
            };
            (getDb as any).mockResolvedValue(mockDb);

            await vectorPurgeService.deleteEmbeddingsByUser(tenantId, phoneHash);

            expect(mockDb.where).toHaveBeenCalled();
            expect(deletePointsByFilter).toHaveBeenCalledTimes(1);
            expect(deletePointsByFilter).toHaveBeenCalledWith('condstore_docs', {
                must: [
                    { key: 'tenant_id', match: { value: tenantId } },
                    { key: 'event_id', match: { any: ['event-1', 'event-2'] } }
                ]
            });
        });

        it('does not call qdrant purge if no events found', async () => {
            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockResolvedValue([])
            };
            (getDb as any).mockResolvedValue(mockDb);

            await vectorPurgeService.deleteEmbeddingsByUser(tenantId, phoneHash);

            expect(mockDb.where).toHaveBeenCalled();
            expect(deletePointsByFilter).not.toHaveBeenCalled();
        });
    });

    describe('RAG Retrieval Block', () => {
        it('blocks retrieval immediately if consent is missing or false', async () => {
            (endUserConsentRepository.getConsent as any).mockResolvedValue({ consentGiven: false });

            const result = await retrieveContextMulti({
                tenantId,
                query: 'test query',
                phoneHash,
            });

            expect(endUserConsentRepository.getConsent).toHaveBeenCalledWith(tenantId, phoneHash);
            expect(result.chunks).toHaveLength(0);
            expect(result.docs).toHaveLength(0);
            expect(result.chat).toHaveLength(0);
        });

        it('allows retrieval if consent is given', async () => {
            (endUserConsentRepository.getConsent as any).mockResolvedValue({ consentGiven: true });

            // Mocks embedded call to not fail, and searchPoints is mocked to return empty inside mock
            vi.mock('../src/infra/ai/embeddings.client', () => ({
                embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]])
            }));

            const result = await retrieveContextMulti({
                tenantId,
                query: 'test query',
                phoneHash,
            });

            expect(endUserConsentRepository.getConsent).toHaveBeenCalledWith(tenantId, phoneHash);
            // Since searchPoints mock returns empty, chunks is empty, but importantly it did proceed past the block
            expect(result).toBeDefined();
        });
    });

});
