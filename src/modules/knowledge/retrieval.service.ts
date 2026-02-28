import { getDb } from '../../infra/db';
import { tenantDocumentChunks, tenantDocumentVersions, tenantDocuments } from '../../drizzle/schema';
import { OpenAIEmbeddingProvider } from './embeddings/openai.provider';
import { EmbeddingProvider } from './embeddings/provider';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../infra/logger';

export interface RetrievedChunk {
    id: string;
    docId: string;
    versionId: string;
    content: string;
    documentTitle: string;
    pageNumber: number | null;
    orderIndex: number;
    charStart: number;
    charEnd: number;
    isSensitive: boolean;
    score: number;
}

export interface RetrievalResult {
    chunks: RetrievedChunk[];
    confidence: number;
}

export class RetrievalService {
    private provider: EmbeddingProvider;

    constructor() {
        this.provider = new OpenAIEmbeddingProvider();
    }

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

    async retrieveRelevantChunks({
        tenantId,
        query,
        topK = 5,
        threshold = 0.78,
        includeSensitive = false,
    }: {
        tenantId: string;
        query: string;
        topK?: number;
        threshold?: number;
        includeSensitive?: boolean;
    }): Promise<RetrievalResult> {
        if (!query.trim()) return { chunks: [], confidence: 0 };

        try {
            // 1. Embed query
            const [queryEmbedding] = await this.provider.embedBatch([query]);
            if (!queryEmbedding || queryEmbedding.length === 0) {
                return { chunks: [], confidence: 0 };
            }

            const db = await getDb();

            // 2. Fetch all valid chunks from this tenant (MVP manual retrieval)
            let queryFilter = and(
                eq(tenantDocumentChunks.tenantId, tenantId),
                eq(tenantDocumentVersions.status, 'ready_indexed')
            );

            if (!includeSensitive) {
                queryFilter = and(queryFilter, eq(tenantDocuments.isSensitive, false));
            }

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

            // 3. Compute scores and filter
            const scoredChunks: RetrievedChunk[] = allChunks
                .map(chunk => {
                    const vec = Array.isArray(chunk.embedding) ? (chunk.embedding as number[]) : [];
                    let score = 0;
                    if (vec.length > 0 && vec.length === queryEmbedding.length) {
                        score = this.cosineSimilarity(queryEmbedding, vec);
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

            // 4. Sort and limit
            scoredChunks.sort((a, b) => b.score - a.score);
            const topChunks = scoredChunks.slice(0, topK);

            const highestConfidence = topChunks.length > 0 ? topChunks[0].score : 0;

            return {
                chunks: topChunks,
                confidence: highestConfidence,
            };

        } catch (error) {
            logger.error('Failed to retrieve chunks', error as Error, { tenantId });
            return { chunks: [], confidence: 0 };
        }
    }
}

export const retrievalService = new RetrievalService();
