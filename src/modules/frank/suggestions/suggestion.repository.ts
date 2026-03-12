import { getDb } from '@/infra/db';
import { frankSuggestions, type NewFrankSuggestionRecord, type FrankSuggestionRecord } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export class SuggestionRepository {
    async create(data: Omit<NewFrankSuggestionRecord, 'id' | 'createdAt'>): Promise<string> {
        const db = await getDb();
        const id = randomUUID();

        await db.insert(frankSuggestions).values({
            id,
            ...data,
        });

        return id;
    }

    async findById(tenantId: string, id: string): Promise<FrankSuggestionRecord | null> {
        const db = await getDb();
        
        const [existing] = await db.select()
            .from(frankSuggestions)
            .where(and(
                eq(frankSuggestions.id, id),
                eq(frankSuggestions.tenantId, tenantId),
            ))
            .limit(1);

        return existing || null;
    }

    async listPending(tenantId: string, conversationId?: string): Promise<FrankSuggestionRecord[]> {
        const db = await getDb();

        const conditions = [
            eq(frankSuggestions.tenantId, tenantId),
            eq(frankSuggestions.status, 'generated'),
        ];

        if (conversationId) conditions.push(eq(frankSuggestions.conversationId, conversationId));

        return db.select()
            .from(frankSuggestions)
            .where(and(...conditions))
            .orderBy(desc(frankSuggestions.createdAt))
            .limit(20);
    }

    async updateStatus(
        tenantId: string, 
        id: string, 
        status: 'approved' | 'edited' | 'rejected', 
        approvedBy: string,
        finalResponse?: string
    ): Promise<boolean> {
        const db = await getDb();
        
        const updates: any = {
            status,
            approvedBy,
            approvedAt: new Date(),
        };

        if (finalResponse) {
            updates.suggestedResponse = finalResponse;
        }

        const result = await db.update(frankSuggestions)
            .set(updates)
            .where(and(
                eq(frankSuggestions.id, id),
                eq(frankSuggestions.tenantId, tenantId),
            ));

        return result[0].affectedRows > 0;
    }
}

export const suggestionRepository = new SuggestionRepository();
