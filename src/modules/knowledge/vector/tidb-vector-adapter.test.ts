import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TiDBVectorStore } from './tidb-vector-adapter';
import { getDb } from '../../../infra/db';

const mockExecute = vi.fn();

vi.mock('../../../infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('../../../infra/logger', () => ({
    logger: {
        error: vi.fn(),
    },
}));

describe('TiDBVectorStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockExecute.mockReset();
        vi.mocked(getDb).mockResolvedValue({ execute: mockExecute } as never);
    });

    it('rejects invalid vectors before touching the database', async () => {
        const store = new TiDBVectorStore();

        await expect(
            store.upsert('tenant-1', 'chunk-1', [0.12, Number.POSITIVE_INFINITY], {}),
        ).rejects.toThrow('vector[1] must be a finite number');

        await expect(
            store.search('tenant-1', [0.1, Number.NaN], 5, 0.7),
        ).rejects.toThrow('queryVector[1] must be a finite number');

        expect(getDb).not.toHaveBeenCalled();
    });

    it('maps valid search results after validating and serializing the query vector safely', async () => {
        mockExecute.mockResolvedValueOnce([[{
            chunk_id: 'chunk-1',
            doc_id: 'doc-1',
            version_id: 'version-1',
            content: 'conteudo',
            doc_title: 'Documento',
            page_number: 2,
            order_index: 0,
            char_start: 0,
            char_end: 8,
            is_sensitive: 0,
            similarity_score: '0.91',
        }], []]);

        const store = new TiDBVectorStore();
        const result = await store.search('tenant-1', [0.1, 0.2, 0.3], 5, 0.7);

        expect(result).toEqual([{
            id: 'chunk-1',
            docId: 'doc-1',
            versionId: 'version-1',
            content: 'conteudo',
            documentTitle: 'Documento',
            pageNumber: 2,
            orderIndex: 0,
            charStart: 0,
            charEnd: 8,
            isSensitive: false,
            score: 0.91,
        }]);
        expect(mockExecute).toHaveBeenCalledTimes(1);
    });
});
