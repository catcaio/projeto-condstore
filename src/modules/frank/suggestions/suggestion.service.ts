import { getDb } from '@/infra/db';
import { frankSuggestions, type NewFrankSuggestionRecord, type FrankSuggestionRecord } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { logger } from '@/infra/logger';

export interface GenerateSuggestionInput {
    tenantId: string;
    sessionId: string;
    suggestedResponse: string;
    confidence: number;
    source: 'playbook' | 'knowledge' | 'tool';
}

/**
 * Generate and persist a suggestion for operator review.
 * Only called when conversationMode === 'SUPERVISED'.
 */
export async function generateSuggestion(input: GenerateSuggestionInput): Promise<string> {
    const db = await getDb();
    const id = randomUUID();

    const record: NewFrankSuggestionRecord = {
        id,
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        suggestedResponse: input.suggestedResponse,
        confidence: String(input.confidence),
        source: input.source,
        approved: false,
    };

    await db.insert(frankSuggestions).values(record);

    logger.info('frank_suggestion_generated', {
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        source: input.source,
        suggestionId: id,
    });

    publishOperationalEvent({
        tenantId: input.tenantId,
        eventType: 'frank_suggestion_generated',
        eventDomain: 'OPERATIONS',
        entityId: id,
        customerId: null,
        sessionId: input.sessionId,
        payload: { source: input.source, confidence: input.confidence },
    }).catch(() => {});

    return id;
}

/**
 * Approve a suggestion (operator confirms the suggested response).
 */
export async function approveSuggestion(tenantId: string, id: string): Promise<boolean> {
    const db = await getDb();

    const [existing] = await db.select()
        .from(frankSuggestions)
        .where(and(
            eq(frankSuggestions.id, id),
            eq(frankSuggestions.tenantId, tenantId),
        ))
        .limit(1);

    if (!existing) {
        return false;
    }

    await db.update(frankSuggestions)
        .set({ approved: true })
        .where(and(
            eq(frankSuggestions.id, id),
            eq(frankSuggestions.tenantId, tenantId),
        ));

    logger.info('frank_suggestion_approved', {
        tenantId,
        suggestionId: id,
        sessionId: existing.sessionId,
    });

    publishOperationalEvent({
        tenantId,
        eventType: 'frank_suggestion_approved',
        eventDomain: 'OPERATIONS',
        entityId: id,
        customerId: null,
        sessionId: existing.sessionId,
        payload: { source: existing.source, confidence: existing.confidence },
    }).catch(() => {});

    return true;
}

/**
 * List pending (unapproved) suggestions for a session.
 */
export async function listPendingSuggestions(
    tenantId: string,
    sessionId?: string,
): Promise<FrankSuggestionRecord[]> {
    const db = await getDb();

    const conditions = [
        eq(frankSuggestions.tenantId, tenantId),
        eq(frankSuggestions.approved, false),
    ];

    if (sessionId) {
        conditions.push(eq(frankSuggestions.sessionId, sessionId));
    }

    return db.select()
        .from(frankSuggestions)
        .where(and(...conditions))
        .orderBy(desc(frankSuggestions.createdAt))
        .limit(20);
}
