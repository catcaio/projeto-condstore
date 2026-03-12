import { saveMemoryEntry, getRecentMessages } from './memory.repository';
import { logger } from '@/infra/logger';

export interface MemoryContext {
    messages: Array<{
        id: string;
        role: string;
        message: string;
        intent: string | null;
        timestamp: Date;
    }>;
}

/**
 * Record an inbound user message to conversation memory.
 */
export async function recordInboundMessage(
    tenantId: string,
    sessionId: string,
    message: string,
    intent?: string | null,
    entities?: Record<string, unknown> | null,
): Promise<void> {
    try {
        await saveMemoryEntry({
            tenantId,
            sessionId,
            role: 'user',
            message,
            intent,
            entities,
        });
    } catch (err) {
        logger.warn('frank_memory_save_inbound_error', {
            tenantId,
            sessionId,
            error: (err as Error).message,
        });
    }
}

/**
 * Record an outbound assistant/operator message to conversation memory.
 */
export async function recordOutboundMessage(
    tenantId: string,
    sessionId: string,
    message: string,
    intent?: string | null,
    role: 'assistant' | 'operator' = 'assistant',
): Promise<void> {
    try {
        await saveMemoryEntry({
            tenantId,
            sessionId,
            role,
            message,
            intent,
        });
    } catch (err) {
        logger.warn('frank_memory_save_outbound_error', {
            tenantId,
            sessionId,
            error: (err as Error).message,
        });
    }
}

/**
 * Load conversation context: last N messages for a session.
 */
export async function loadConversationContext(
    tenantId: string,
    sessionId: string,
    limit = 5,
): Promise<MemoryContext> {
    try {
        const messages = await getRecentMessages(tenantId, sessionId, limit);
        return { messages };
    } catch (err) {
        logger.warn('frank_memory_load_error', {
            tenantId,
            sessionId,
            error: (err as Error).message,
        });
        return { messages: [] };
    }
}
