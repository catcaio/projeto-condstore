/**
 * Frank Context Resolver.
 *
 * Resolves conversation context for a WhatsApp customer:
 * - Customer identification by phone
 * - Last messages (conversation history)
 * - Last freight quotes
 */

import { getDb } from '@/infra/db';
import { messages, freightSimulations } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { normalizeAndHash } from '@/lib/phone';
import { logger } from '@/infra/logger';
import { getSessionState, createSessionState, type SessionState } from './session.repository';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CustomerContext {
    phone: string;
    phoneHash: string;
    isReturning: boolean;
}

export interface MessageSummary {
    direction: string;
    body: string;
    intent: string;
    createdAt: Date;
}

export interface QuoteSummary {
    simulationId: string;
    cep: string;
    productRef: string | null;
    carrierSelected: string | null;
    quotedFreight: string | null;
    chargedWeight: string;
    createdAt: Date;
}

export interface ConversationContext {
    customer: CustomerContext;
    lastMessages: MessageSummary[];
    lastQuotes: QuoteSummary[];
    sessionState: SessionState | null;
}

// ─── Resolver ───────────────────────────────────────────────────────────────

/**
 * Resolve full conversation context for a phone number.
 *
 * 1. Identify customer by phone hash (privacy-safe)
 * 2. Fetch last 5 messages for conversation continuity
 * 3. Fetch last 3 freight quotes for the tenant
 */
export async function resolveConversationContext(
    tenantId: string,
    phone: string,
): Promise<ConversationContext> {
    const { hash: phoneHash, normalized } = normalizeAndHash(phone);
    const db = await getDb();

    // 1. Check if returning customer (has previous messages)
    let lastMessages: MessageSummary[] = [];
    try {
        const rows = await db.select({
            direction: messages.direction,
            body: messages.body,
            intent: messages.intent,
            createdAt: messages.createdAt,
        })
            .from(messages)
            .where(and(
                eq(messages.tenantId, tenantId),
                eq(messages.phoneHash, phoneHash),
            ))
            .orderBy(desc(messages.createdAt))
            .limit(5);

        lastMessages = rows.map(r => ({
            direction: r.direction,
            body: r.body.slice(0, 100), // Truncate for context, not full body
            intent: r.intent,
            createdAt: r.createdAt,
        }));
    } catch (err) {
        logger.warn('context_resolver_messages_error', { tenantId, error: (err as Error).message });
    }

    const isReturning = lastMessages.length > 0;

    // 2. Fetch last freight quotes for the tenant (global, not per-phone since simulations don't store phone)
    let lastQuotes: QuoteSummary[] = [];
    try {
        const rows = await db.select({
            id: freightSimulations.id,
            cep: freightSimulations.cep,
            productRefs: freightSimulations.productRefs,
            carrierSelected: freightSimulations.carrierSelected,
            quotedFreight: freightSimulations.quotedFreight,
            chargedWeight: freightSimulations.chargedWeight,
            createdAt: freightSimulations.createdAt,
        })
            .from(freightSimulations)
            .where(eq(freightSimulations.tenantId, tenantId))
            .orderBy(desc(freightSimulations.createdAt))
            .limit(3);

        lastQuotes = rows.map(r => ({
            simulationId: r.id,
            cep: r.cep,
            productRef: (r.productRefs && r.productRefs.length > 0) ? r.productRefs[0] : null,
            carrierSelected: r.carrierSelected,
            quotedFreight: r.quotedFreight ? parseFloat(r.quotedFreight).toFixed(2) : null,
            chargedWeight: r.chargedWeight,
            createdAt: r.createdAt,
        }));
    } catch (err) {
        logger.warn('context_resolver_quotes_error', { tenantId, error: (err as Error).message });
    }

    logger.info('context_resolver_resolved', {
        tenantId,
        isReturning,
        messageCount: lastMessages.length,
        quoteCount: lastQuotes.length,
    });

    // 3. Load or create session state (key = tenantId + phoneHash)
    let sessionState: SessionState | null = null;
    try {
        sessionState = await getSessionState(tenantId, phoneHash);
        if (!sessionState) {
            sessionState = await createSessionState(tenantId, phoneHash);
        }
    } catch (err) {
        logger.warn('context_resolver_session_error', { tenantId, error: (err as Error).message });
    }

    return {
        customer: {
            phone: normalized,
            phoneHash,
            isReturning,
        },
        lastMessages,
        lastQuotes,
        sessionState,
    };
}
