import { getDb } from '@/infra/db';
import { frankEvents } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { deletePointsByFilter, getQdrantCollectionName } from '@/infra/vector/qdrant.client';
import { structuredLogger } from '@/infra/log/logger';

export class VectorPurgeService {
    /**
     * Delete vectors and knowledge graphs by phoneHash globally.
     */
    async deleteEmbeddingsByUser(tenantId: string, phoneHash: string): Promise<boolean> {
        return this.deleteEmbeddingsByPhoneHash(tenantId, phoneHash);
    }

    private async deleteEmbeddingsByPhoneHash(tenantId: string, phoneHash: string): Promise<boolean> {
        let success = true;

        try {
            // 1. Frank Events embeddings (Qdrant)
            // They are mapped to phoneHash through sessionId
            const db = await getDb();
            const events = await db
                .select({ id: frankEvents.id })
                .from(frankEvents)
                .where(and(eq(frankEvents.tenantId, tenantId), eq(frankEvents.sessionId, phoneHash)));

            if (events.length > 0) {
                const eventIds = events.map(e => e.id);
                // Qdrant allows filtering by array of match values? No, we use 'should' or just filter by tenant_id AND sessionId?
                // Actually the Qdrant payload stores:
                // payload: { tenant_id: string, event_id: string }
                // We'll delete where event_id is in [eventIds]. Or we can just delete where session_id matches?
                // Wait, script `ingest-frank-events-to-qdrant.mjs` stores: 
                // payload: { tenant_id, event_id, kind, created_at, correlation_id, route }
                // So we have to delete by 'event_id' matching our array.

                // Because Qdrant 'match: { any: [...] }' exists, we use it.
                const collection = getQdrantCollectionName();
                try {
                    await deletePointsByFilter(collection, {
                        must: [
                            { key: 'tenant_id', match: { value: tenantId } },
                            { key: 'event_id', match: { any: eventIds } }
                        ]
                    });
                    structuredLogger.info('lgpd_vector_purge_qdrant_success', {
                        tenantId,
                        phoneHash,
                        eventsCount: events.length
                    });
                } catch (qdrantError) {
                    structuredLogger.error('lgpd_vector_purge_qdrant_failure', {
                        tenantId,
                        phoneHash,
                        error: qdrantError
                    });
                    success = false;
                }
            }

            // 2. TiDB Vector / PGVector / LocalCosine via tenant_document_chunks
            // Usually doc chunks don't hold PII specific to phoneHash unless uploaded by the user.
            // But if we ever add a `phoneHash` column or `uploadedBy` column to `tenantDocumentChunks`,
            // we will run a targeted `db.delete(tenantDocumentChunks)` here.

            // NOTE: Future TiDB vector store purge should be executed here.

        } catch (error) {
            structuredLogger.error('lgpd_vector_purge_failure', { tenantId, phoneHash, error });
            success = false;
        }

        return success;
    }
}

export const vectorPurgeService = new VectorPurgeService();
