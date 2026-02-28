import { VectorStore } from './vector-store';
import { getDb } from '../../../infra/db';
import { tenantDocumentChunks, tenantDocumentVersions, tenantDocuments } from '../../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { RetrievedChunk } from '../retrieval.service';
import { logger } from '../../../infra/logger';

export class TiDBVectorStore implements VectorStore {
    async upsert(tenantId: string, chunkId: string, vector: number[], metadata: any): Promise<void> {
        // Here we format the vector as a serialized string mapped for TiDB VECTOR column if available.
        // E.g.: UPDATE tenant_document_chunks SET vector_embedding = '[0.1, 0.2, ...]'
        // Doing this via direct sql injection mock since Drizzle lacks native TiDB vector type for now.
        const db = await getDb();
        try {
            await db.execute(sql`
                UPDATE tenant_document_chunks 
                SET vector_embedding = ${JSON.stringify(vector)} 
                WHERE id = ${chunkId} AND tenant_id = ${tenantId}
            `);
        } catch (e) {
            logger.error('Failed Native TiDB upsert', e as Error, { tenantId, chunkId });
        }
    }

    async search(
        tenantId: string,
        queryVector: number[],
        topK: number,
        threshold: number,
        includeSensitive: boolean = false
    ): Promise<RetrievedChunk[]> {
        const db = await getDb();

        try {
            // Using TiDB VEC_COSINE_DISTANCE function pattern mock.
            // distance = 1 - VEC_COSINE_DISTANCE(vectorEmbedding, queryVector)
            // if distance > threshold...
            // Note: Since this is an MVP abstraction for scale, we use Raw Queries if feature flag is active.

            let query = `
                SELECT 
                    c.id as chunk_id,
                    c.content,
                    c.page_number,
                    c.order_index,
                    c.char_start,
                    c.char_end,
                    d.title as doc_title,
                    d.id as doc_id,
                    d.is_sensitive,
                    v.id as version_id,
                    (1 - VEC_COSINE_DISTANCE(c.vector_embedding, ${JSON.stringify(queryVector)})) as similarity_score
                FROM tenant_document_chunks c
                JOIN tenant_document_versions v ON c.version_id = v.id
                JOIN tenant_documents d ON v.document_id = d.id
                WHERE c.tenant_id = ? AND v.status = 'ready_indexed'
            `;

            const params: any[] = [tenantId];

            if (!includeSensitive) {
                query += ` AND d.is_sensitive = ?`;
                params.push(false);
            }

            query += ` HAVING similarity_score >= ? ORDER BY similarity_score DESC LIMIT ?`;
            params.push(threshold, topK);

            const [resultRows] = await db.execute(sql.raw(query).mapWith(String));

            // Map the rows back to RetrievedChunk interface correctly depending on raw output format
            const chunks: RetrievedChunk[] = (resultRows as unknown as any[]).map(row => ({
                id: row.chunk_id,
                docId: row.doc_id,
                versionId: row.version_id,
                content: row.content,
                documentTitle: row.doc_title,
                pageNumber: row.page_number,
                orderIndex: row.order_index,
                charStart: row.char_start,
                charEnd: row.char_end,
                isSensitive: row.is_sensitive === 1 || row.is_sensitive === true,
                score: Number(row.similarity_score),
            }));

            return chunks;

        } catch (error) {
            logger.error('TiDB Native Vector Search Failed, initiating fallback', error as Error, { tenantId });
            // In a real framework, we'd throw a specific error and catch in the caller to fallback to Local
            throw error;
        }
    }

    async deleteByVersion(tenantId: string, versionId: string): Promise<void> {
        // Native DB cascades or manages this
        return Promise.resolve();
    }
}
