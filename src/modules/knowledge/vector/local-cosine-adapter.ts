import { VectorStore } from './vector-store';
import { getDb } from '../../../infra/db';
import { tenantDocumentChunks, tenantDocumentVersions, tenantDocuments } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { RetrievedChunk } from '../retrieval.service';
import { logger } from '../../../infra/logger';

export class LocalCosineVectorStore implements VectorStore {
    // Manual cosine similarity since TiDB Vector type isn't fully set up in Drizzle MVP (fallback)
    private cosineSimilarity(vec1: number[], vec2: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            normA += vec1[i] * vec1[i];
            normB += vec2[i] * vec2[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async upsert(tenantId: string, chunkId: string, vector: number[], metadata: any): Promise<void> {
        // Handled during normal ingestion right now for MVP.
        // We only implement this signature to fulfill the interface.
        return Promise.resolve();
    }

    async search(
        tenantId: string,
        queryVector: number[],
        topK: number,
        threshold: number,
        includeSensitive: boolean = false
    ): Promise<RetrievedChunk[]> {
        const db = await getDb();

        let queryFilter = and(
            eq(tenantDocumentChunks.tenantId, tenantId),
            eq(tenantDocumentVersions.status, 'ready_indexed')
        );

        if (!includeSensitive) {
            queryFilter = and(queryFilter, eq(tenantDocuments.isSensitive, false));
        }

        try {
            const allChunks = await db.select({
                id: tenantDocumentChunks.id,
                docId: tenantDocuments.id,
                versionId: tenantDocumentVersions.id,
                content: tenantDocumentChunks.content,
                embedding: tenantDocumentChunks.embedding,
                documentTitle: tenantDocuments.title,
                pageNumber: tenantDocumentChunks.pageNumber,
                orderIndex: tenantDocumentChunks.orderIndex,
                charStart: tenantDocumentChunks.charStart,
                charEnd: tenantDocumentChunks.charEnd,
                isSensitive: tenantDocuments.isSensitive,
            })
                .from(tenantDocumentChunks)
                .innerJoin(tenantDocumentVersions, eq(tenantDocumentVersions.id, tenantDocumentChunks.versionId))
                .innerJoin(tenantDocuments, eq(tenantDocuments.id, tenantDocumentVersions.documentId))
                .where(queryFilter);

            const scoredChunks: RetrievedChunk[] = allChunks
                .map(chunk => {
                    const vec = Array.isArray(chunk.embedding) ? (chunk.embedding as number[]) : [];
                    let score = 0;
                    if (vec.length > 0 && vec.length === queryVector.length) {
                        score = this.cosineSimilarity(queryVector, vec);
                    }
                    return {
                        id: chunk.id,
                        docId: chunk.docId,
                        versionId: chunk.versionId,
                        content: chunk.content,
                        documentTitle: chunk.documentTitle,
                        pageNumber: chunk.pageNumber,
                        orderIndex: chunk.orderIndex,
                        charStart: chunk.charStart,
                        charEnd: chunk.charEnd,
                        isSensitive: chunk.isSensitive,
                        score,
                    };
                })
                .filter(c => c.score >= threshold);

            scoredChunks.sort((a, b) => b.score - a.score);
            return scoredChunks.slice(0, topK);

        } catch (error) {
            logger.error('LocalCosineVectorStore Search failed', error as Error, { tenantId });
            return [];
        }
    }

    async deleteByVersion(tenantId: string, versionId: string): Promise<void> {
        return Promise.resolve(); // Also handled by normal Drizzle deletes
    }
}
