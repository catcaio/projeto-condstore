import { searchKnowledge, type CreateKnowledgeDto, type UpdateKnowledgeDto, createKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry, getKnowledgeById, listKnowledge } from './knowledge.repository';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { logger } from '@/infra/logger';
import type { FrankKnowledgeRecord } from '@/drizzle/schema';

export interface KnowledgeSearchResult {
    entries: FrankKnowledgeRecord[];
    query: string;
}

/**
 * Search knowledge base for a given query.
 * Splits query into keywords and searches titles + content.
 * Returns ranked results (up to 10).
 */
export async function searchKnowledgeForQuery(
    tenantId: string,
    query: string,
): Promise<KnowledgeSearchResult> {
    const trimmed = query.trim();
    if (!trimmed) {
        return { entries: [], query: trimmed };
    }

    const entries = await searchKnowledge(tenantId, trimmed);

    if (entries.length > 0) {
        logger.info('frank_knowledge_search_hit', {
            tenantId,
            query: trimmed,
            resultsCount: entries.length,
        });
    }

    return { entries, query: trimmed };
}

/**
 * Search knowledge base and emit event for orchestrator integration.
 * Returns the best matching entry or null.
 */
export async function resolveKnowledge(
    tenantId: string,
    query: string,
    sessionId: string | null,
): Promise<FrankKnowledgeRecord | null> {
    const result = await searchKnowledgeForQuery(tenantId, query);

    if (result.entries.length === 0) {
        return null;
    }

    const best = result.entries[0];

    publishOperationalEvent({
        tenantId,
        eventType: 'frank_knowledge_used',
        eventDomain: 'OPERATIONS',
        entityId: best.id,
        customerId: null,
        sessionId,
        payload: {
            knowledgeId: best.id,
            title: best.title,
            source: best.source,
            query: result.query,
        },
    }).catch(() => {});

    return best;
}

// ─── CRUD Passthrough ────────────────────────────────────────────────────────

export { createKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry, getKnowledgeById, listKnowledge };
export type { CreateKnowledgeDto, UpdateKnowledgeDto };
