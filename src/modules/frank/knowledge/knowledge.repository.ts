import { getDb } from '@/infra/db';
import { frankKnowledge, type FrankKnowledgeRecord, type NewFrankKnowledgeRecord } from '@/drizzle/schema';
import { eq, and, desc, like, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface CreateKnowledgeDto {
    tenantId: string;
    title: string;
    content: string;
    tags?: string[];
    source?: string;
}

export interface UpdateKnowledgeDto {
    id: string;
    tenantId: string;
    title?: string;
    content?: string;
    tags?: string[];
    source?: string;
}

export async function createKnowledgeEntry(data: CreateKnowledgeDto): Promise<string> {
    const db = await getDb();
    const id = randomUUID();

    const record: NewFrankKnowledgeRecord = {
        id,
        tenantId: data.tenantId,
        title: data.title,
        content: data.content,
        tags: data.tags ?? [],
        source: data.source ?? 'manual',
    };

    await db.insert(frankKnowledge).values(record);
    return id;
}

export async function updateKnowledgeEntry(data: UpdateKnowledgeDto): Promise<void> {
    const db = await getDb();
    const { id, tenantId, ...updates } = data;
    // Defense-in-depth: never allow a caller-provided tenantId to leak into the SET
    // clause (would permit cross-tenant writes via field proliferation).
    delete (updates as Record<string, unknown>).tenantId;
    delete (updates as Record<string, unknown>).id;

    await db.update(frankKnowledge)
        .set(updates)
        .where(and(
            eq(frankKnowledge.id, id),
            eq(frankKnowledge.tenantId, tenantId)
        ));
}

export async function deleteKnowledgeEntry(tenantId: string, id: string): Promise<void> {
    const db = await getDb();

    await db.delete(frankKnowledge)
        .where(and(
            eq(frankKnowledge.id, id),
            eq(frankKnowledge.tenantId, tenantId)
        ));
}

export async function getKnowledgeById(tenantId: string, id: string): Promise<FrankKnowledgeRecord | null> {
    const db = await getDb();
    const [row] = await db.select()
        .from(frankKnowledge)
        .where(and(
            eq(frankKnowledge.id, id),
            eq(frankKnowledge.tenantId, tenantId)
        ))
        .limit(1);

    return row ?? null;
}

export async function listKnowledge(tenantId: string): Promise<FrankKnowledgeRecord[]> {
    const db = await getDb();
    return db.select()
        .from(frankKnowledge)
        .where(eq(frankKnowledge.tenantId, tenantId))
        .orderBy(desc(frankKnowledge.updatedAt));
}

export async function searchKnowledge(tenantId: string, query: string): Promise<FrankKnowledgeRecord[]> {
    const db = await getDb();
    const searchTerm = `%${query}%`;

    return db.select()
        .from(frankKnowledge)
        .where(and(
            eq(frankKnowledge.tenantId, tenantId),
            or(
                like(frankKnowledge.title, searchTerm),
                like(frankKnowledge.content, searchTerm),
            ),
        ))
        .orderBy(desc(frankKnowledge.updatedAt))
        .limit(10);
}
