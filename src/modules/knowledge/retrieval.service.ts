import { getDb } from '../../infra/db';
import { tenantDocumentChunks, tenantDocumentVersions, tenantDocuments } from '../../drizzle/schema';
import { OpenAIEmbeddingProvider } from './embeddings/openai.provider';
import { EmbeddingProvider } from './embeddings/provider';
import { logger } from '../../infra/logger';
import { VectorStore } from './vector/vector-store';
import { LocalCosineVectorStore } from './vector/local-cosine-adapter';
import { TiDBVectorStore } from './vector/tidb-vector-adapter';

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
    private localStore: VectorStore;
    private nativeStore: VectorStore;

    constructor() {
        this.provider = new OpenAIEmbeddingProvider();
        this.localStore = new LocalCosineVectorStore();
        this.nativeStore = new TiDBVectorStore();
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

            // 2. Decide Vector Store via Feature Flag
            const ENABLE_VECTOR_NATIVE = process.env.ENABLE_VECTOR_NATIVE === 'true';
            let topChunks: RetrievedChunk[] = [];

            if (ENABLE_VECTOR_NATIVE) {
                try {
                    topChunks = await this.nativeStore.search(tenantId, queryEmbedding, topK, threshold, includeSensitive);
                } catch (nativeErr) {
                    logger.warn('Native Vector Search failed, gracefully falling back to LocalCosine', { error: (nativeErr as Error).message, tenantId });
                    topChunks = await this.localStore.search(tenantId, queryEmbedding, topK, threshold, includeSensitive);
                }
            } else {
                topChunks = await this.localStore.search(tenantId, queryEmbedding, topK, threshold, includeSensitive);
            }

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
