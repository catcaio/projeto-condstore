import { VectorStore } from './vector-store';
import { getDb } from '../../../infra/db';
import { sql } from 'drizzle-orm';
import { RetrievedChunk } from '../retrieval.service';
import { logger } from '../../../infra/logger';

function validateFiniteVector(value: unknown, fieldName: string): number[] {
    if (!Array.isArray(value)) {
        throw new Error(`${fieldName} must be an array of finite numbers`);
    }

    return value.map((entry, index) => {
        if (typeof entry !== 'number' || !Number.isFinite(entry)) {
            throw new Error(`${fieldName}[${index}] must be a finite number`);
        }

        return entry;
    });
}

function serializeValidatedVector(value: unknown, fieldName: string): string {
    const vector = validateFiniteVector(value, fieldName);

    // Safe because every element was validated as a finite numeric primitive.
    return JSON.stringify(vector);
}

function unwrapRows<T>(result: unknown): T[] {
    if (Array.isArray(result) && Array.isArray(result[0])) {
        return result[0] as T[];
    }

    if (Array.isArray(result)) {
        return result as T[];
    }

    return [];
}

export class TiDBVectorStore implements VectorStore {
    async upsert(tenantId: string, chunkId: string, vector: number[], metadata: any): Promise<void> {
        const serializedVector = serializeValidatedVector(vector, 'vector');
        const db = await getDb();

        try {
            await db.execute(sql`
                UPDATE tenant_document_chunks 
                SET vector_embedding = ${serializedVector} 
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
        const serializedQueryVector = serializeValidatedVector(queryVector, 'queryVector');
        const db = await getDb();

        try {
            const sensitiveFilter = includeSensitive
                ? sql``
                : sql` AND d.is_sensitive = ${false}`;
            // TiDB vector distance expects a literal array expression here; this raw fragment is safe
            // because serializeValidatedVector only emits JSON for arrays of finite numbers.
            const safeQueryVectorLiteral = sql.raw(serializedQueryVector);

            const result = await db.execute(sql`
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
                    (1 - VEC_COSINE_DISTANCE(c.vector_embedding, ${safeQueryVectorLiteral})) as similarity_score
                FROM tenant_document_chunks c
                JOIN tenant_document_versions v ON c.version_id = v.id
                JOIN tenant_documents d ON v.document_id = d.id
                WHERE c.tenant_id = ${tenantId} AND v.status = 'ready_indexed'
                ${sensitiveFilter}
                HAVING similarity_score >= ${threshold}
                ORDER BY similarity_score DESC
                LIMIT ${topK}
            `);
            const resultRows = unwrapRows<any>(result);

            // Map the rows back to RetrievedChunk interface correctly depending on raw output format
            const chunks: RetrievedChunk[] = resultRows.map(row => ({
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
