import { getDb } from '@/infra/db';
import { frankConversationMemory, type NewFrankConversationMemoryRecord } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function saveMemoryEntry(data: {
    tenantId: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'operator';
    message: string;
    intent?: string | null;
    entities?: Record<string, unknown> | null;
}): Promise<string> {
    const db = await getDb();
    const id = randomUUID();

    const record: NewFrankConversationMemoryRecord = {
        id,
        tenantId: data.tenantId,
        sessionId: data.sessionId,
        role: data.role,
        message: data.message,
        intent: data.intent ?? null,
        entities: data.entities ?? null,
    };

    await db.insert(frankConversationMemory).values(record);
    return id;
}

export async function getRecentMessages(
    tenantId: string,
    sessionId: string,
    limit = 5,
): Promise<Array<{
    id: string;
    role: string;
    message: string;
    intent: string | null;
    timestamp: Date;
}>> {
    const db = await getDb();

    const rows = await db.select({
        id: frankConversationMemory.id,
        role: frankConversationMemory.role,
        message: frankConversationMemory.message,
        intent: frankConversationMemory.intent,
        timestamp: frankConversationMemory.timestamp,
    })
        .from(frankConversationMemory)
        .where(and(
            eq(frankConversationMemory.tenantId, tenantId),
            eq(frankConversationMemory.sessionId, sessionId),
        ))
        .orderBy(desc(frankConversationMemory.timestamp))
        .limit(limit);

    return rows;
}
