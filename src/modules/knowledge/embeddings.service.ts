import { getDb } from '../../infra/db';
import { tenantDocumentChunks } from '../../drizzle/schema';
import { OpenAIEmbeddingProvider } from './embeddings/openai.provider';
import { DisabledEmbeddingProvider } from './embeddings/disabled.provider';
import { EmbeddingProvider } from './embeddings/provider';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../infra/logger';

function isRagEnabledByEnv(): boolean {
    const isDefaultEnabled = String(process.env.RAG_ENABLED_DEFAULT || 'false').toLowerCase() === 'true';
    const hasTenantsEnabled = String(process.env.RAG_ENABLED_TENANTS || '').trim().length > 0;
    return isDefaultEnabled || hasTenantsEnabled;
}

export class EmbeddingsService {
    private provider: EmbeddingProvider;

    constructor() {
        if (isRagEnabledByEnv() && process.env.OPENAI_API_KEY) {
            this.provider = new OpenAIEmbeddingProvider();
        } else {
            this.provider = new DisabledEmbeddingProvider();
        }
    }

    async generateAndStoreEmbeddings(versionId: string, tenantId: string) {
        const db = await getDb();

        // 1. Fetch chunks
        const chunks = await db.select({
            id: tenantDocumentChunks.id,
            content: tenantDocumentChunks.content,
        }).from(tenantDocumentChunks)
            .where(
                and(
                    eq(tenantDocumentChunks.versionId, versionId),
                    eq(tenantDocumentChunks.tenantId, tenantId)
                )
            );

        if (!chunks.length) {
            logger.warn('No chunks found to embed', { versionId, tenantId });
            return;
        }

        // 2. Batch embedding calls (max ~100)
        const batchSize = 100;
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            const texts = batch.map(c => c.content);

            const vectors = await this.provider.embedBatch(texts);

            // 3. Update chunks with vector
            // using JSON native datatype to hold the FLOAT ARRAY until full VectorDB applies
            await Promise.all(
                batch.map((chunk, j) => {
                    const vector = vectors[j] || [];
                    return db.update(tenantDocumentChunks)
                        .set({ embedding: vector })
                        .where(
                            and(
                                eq(tenantDocumentChunks.id, chunk.id),
                                eq(tenantDocumentChunks.tenantId, tenantId) // Defensive
                            )
                        );
                })
            );
        }

        logger.info('Embeddings generated and stored successfully', { versionId, tenantId, chunksCount: chunks.length });
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        return this.provider.embedBatch(texts);
    }
}

let embeddingsServiceSingleton: EmbeddingsService | null = null;

export function getEmbeddingsService(): EmbeddingsService {
    if (!embeddingsServiceSingleton) {
        embeddingsServiceSingleton = new EmbeddingsService();
    }
    return embeddingsServiceSingleton;
}
