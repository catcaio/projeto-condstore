import { RetrievedChunk } from '../retrieval.service';

/**
 * Interface that abstracts the data store for Vector Embeddings,
 * enabling graceful fallback and future upgrades (like TiDB Vector).
 */
export interface VectorStore {
    /**
     * Store or update chunk data.
     */
    upsert(
        tenantId: string,
        chunkId: string,
        vector: number[],
        metadata: {
            content: string;
            versionId: string;
            docId: string;
            documentTitle: string;
            pageNumber: number | null;
            orderIndex: number;
            charStart: number;
            charEnd: number;
            isSensitive: boolean;
        }
    ): Promise<void>;

    /**
     * Search vector database for most relevant chunks.
     */
    search(
        tenantId: string,
        queryVector: number[],
        topK: number,
        threshold: number,
        includeSensitive?: boolean
    ): Promise<RetrievedChunk[]>;

    /**
     * Clean vectors belonging to a version.
     */
    deleteByVersion(tenantId: string, versionId: string): Promise<void>;
}
