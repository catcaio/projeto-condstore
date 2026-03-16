import { randomUUID } from 'crypto';
import { getDb } from '@/infra/db';
import { searchIndex } from '@/drizzle/schema';
import { logger } from '@/infra/logger';
import { eq, and, or, like, desc, sql } from 'drizzle-orm';

// --- Types ---

export type SearchEntityType = 'customer' | 'order' | 'conversation' | 'quote' | 'shipment' | 'note';

export interface SearchResult {
    id: string;
    entityType: string;
    entityId: string;
    title: string;
    body: string | null;
    phone: string | null;
    email: string | null;
    metadata: Record<string, unknown> | null;
}

// --- Service ---

export const searchService = {
    /**
     * Index or update an entity in the search index.
     */
    async indexEntity(params: {
        tenantId: string;
        entityType: SearchEntityType;
        entityId: string;
        title: string;
        body?: string;
        phone?: string;
        email?: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const db = await getDb();
        const id = randomUUID();

        try {
            await db
                .insert(searchIndex)
                .values({
                    id,
                    tenantId: params.tenantId,
                    entityType: params.entityType,
                    entityId: params.entityId,
                    title: params.title,
                    body: params.body ?? null,
                    phone: params.phone ?? null,
                    email: params.email ?? null,
                    metadataJson: params.metadata ?? null,
                })
                .onDuplicateKeyUpdate({
                    set: {
                        title: params.title,
                        body: params.body ?? null,
                        phone: params.phone ?? null,
                        email: params.email ?? null,
                        metadataJson: params.metadata ?? null,
                        updatedAt: new Date(),
                    },
                });
        } catch (err) {
            logger.error('search_index_entity_failed', err as Error, {
                entityType: params.entityType,
                entityId: params.entityId,
            });
        }
    },

    /**
     * Search across all indexed entities using LIKE matching.
     * Supports text, id, name, phone, email.
     */
    async searchEntities(params: {
        tenantId: string;
        query: string;
        entityType?: SearchEntityType;
        limit?: number;
        offset?: number;
    }): Promise<SearchResult[]> {
        const db = await getDb();
        const term = `%${params.query}%`;
        const limit = params.limit ?? 20;
        const offset = params.offset ?? 0;

        const conditions = [eq(searchIndex.tenantId, params.tenantId)];
        if (params.entityType) {
            conditions.push(eq(searchIndex.entityType, params.entityType));
        }

        // Search across title, body, phone, email, entityId
        conditions.push(
            or(
                like(searchIndex.title, term),
                like(searchIndex.body, term),
                like(searchIndex.phone, term),
                like(searchIndex.email, term),
                like(searchIndex.entityId, term),
            )!,
        );

        try {
            const rows = await db
                .select()
                .from(searchIndex)
                .where(and(...conditions))
                .orderBy(desc(searchIndex.updatedAt))
                .limit(limit)
                .offset(offset);

            return rows.map((r) => ({
                id: r.id,
                entityType: r.entityType,
                entityId: r.entityId,
                title: r.title,
                body: r.body,
                phone: r.phone,
                email: r.email,
                metadata: r.metadataJson as Record<string, unknown> | null,
            }));
        } catch (err) {
            logger.error('search_entities_failed', err as Error, { query: params.query });
            return [];
        }
    },

    /**
     * Refresh a single entity in the search index.
     * This is a placeholder that can be called as a job to re-index from source tables.
     */
    async updateIndex(params: {
        tenantId: string;
        entityType: SearchEntityType;
        entityId: string;
    }): Promise<void> {
        // In a full implementation, this would read from the source table
        // and re-index. For now it's a no-op placeholder that can be wired later.
        logger.info('search_update_index_requested', {
            entityType: params.entityType,
            entityId: params.entityId,
        });
    },
};
