import { getDb } from '@/infra/db';
import { frankPlaybooks, type FrankPlaybookRecord, type NewFrankPlaybookRecord } from '@/drizzle/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface CreatePlaybookDto {
    tenantId: string;
    title: string;
    intent: string;
    triggerPhrases?: string[];
    relatedEntities?: string[];
    responseBase: string;
    responseShort?: string;
    nextStepSuggestion?: string;
    requiresConfirmation?: boolean;
    requiresHumanHandoff?: boolean;
    handoffConditions?: string;
    tags?: string[];
    status?: 'draft' | 'approved' | 'archived';
    priority?: number;
}

export interface UpdatePlaybookDto extends Partial<Omit<CreatePlaybookDto, 'tenantId'>> {
    id: string;
    tenantId: string;
}

export async function createPlaybook(data: CreatePlaybookDto): Promise<string> {
    const db = await getDb();
    const id = randomUUID();

    const record: NewFrankPlaybookRecord = {
        id,
        tenantId: data.tenantId,
        title: data.title,
        intent: data.intent,
        triggerPhrases: data.triggerPhrases ?? [],
        relatedEntities: data.relatedEntities ?? [],
        responseBase: data.responseBase,
        responseShort: data.responseShort ?? null,
        nextStepSuggestion: data.nextStepSuggestion ?? null,
        requiresConfirmation: data.requiresConfirmation ?? false,
        requiresHumanHandoff: data.requiresHumanHandoff ?? false,
        handoffConditions: data.handoffConditions ?? null,
        tags: data.tags ?? [],
        status: data.status ?? 'draft',
        priority: data.priority ?? 0,
    };

    await db.insert(frankPlaybooks).values(record);
    return id;
}

export async function updatePlaybook(data: UpdatePlaybookDto): Promise<void> {
    const db = await getDb();
    const { id, tenantId, ...updates } = data;

    await db.update(frankPlaybooks)
        .set(updates)
        .where(and(
            eq(frankPlaybooks.id, id),
            eq(frankPlaybooks.tenantId, tenantId)
        ));
}

export async function getPlaybookById(tenantId: string, id: string): Promise<FrankPlaybookRecord | null> {
    const db = await getDb();
    const [row] = await db.select()
        .from(frankPlaybooks)
        .where(and(
            eq(frankPlaybooks.id, id),
            eq(frankPlaybooks.tenantId, tenantId)
        ))
        .limit(1);

    return row ?? null;
}

export async function listPlaybooks(tenantId: string): Promise<FrankPlaybookRecord[]> {
    const db = await getDb();
    return db.select()
        .from(frankPlaybooks)
        .where(eq(frankPlaybooks.tenantId, tenantId))
        .orderBy(desc(frankPlaybooks.updatedAt));
}

export async function findApprovedPlaybooksForIntent(tenantId: string, intent: string): Promise<FrankPlaybookRecord[]> {
    const db = await getDb();
    return db.select()
        .from(frankPlaybooks)
        .where(and(
            eq(frankPlaybooks.tenantId, tenantId),
            eq(frankPlaybooks.intent, intent),
            eq(frankPlaybooks.status, 'approved')
        ))
        .orderBy(desc(frankPlaybooks.priority));
}

export async function archivePlaybook(tenantId: string, id: string): Promise<void> {
    const db = await getDb();
    await db.update(frankPlaybooks)
        .set({ status: 'archived' })
        .where(and(
            eq(frankPlaybooks.id, id),
            eq(frankPlaybooks.tenantId, tenantId)
        ));
}
