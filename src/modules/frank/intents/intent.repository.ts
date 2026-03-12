import { getDb } from '@/infra/db';
import { frankIntentTraining, type NewFrankIntentTrainingRecord, type FrankIntentTrainingRecord } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export class IntentRepository {
    async create(data: Omit<NewFrankIntentTrainingRecord, 'id' | 'createdAt'>): Promise<string> {
        const db = await getDb();
        const id = randomUUID();

        await db.insert(frankIntentTraining).values({
            id,
            ...data,
        });

        return id;
    }

    async findById(tenantId: string, id: string): Promise<FrankIntentTrainingRecord | null> {
        const db = await getDb();
        
        const [existing] = await db.select()
            .from(frankIntentTraining)
            .where(and(
                eq(frankIntentTraining.id, id),
                eq(frankIntentTraining.tenantId, tenantId),
            ))
            .limit(1);

        return existing || null;
    }

    async listCaptured(tenantId: string): Promise<FrankIntentTrainingRecord[]> {
        const db = await getDb();

        return db.select()
            .from(frankIntentTraining)
            .where(and(
                eq(frankIntentTraining.tenantId, tenantId),
                eq(frankIntentTraining.status, 'captured'),
            ))
            .orderBy(desc(frankIntentTraining.createdAt))
            .limit(50);
    }

    async updateStatus(
        tenantId: string, 
        id: string, 
        status: 'validated' | 'ignored'
    ): Promise<boolean> {
        const db = await getDb();
        
        const result = await db.update(frankIntentTraining)
            .set({ status })
            .where(and(
                eq(frankIntentTraining.id, id),
                eq(frankIntentTraining.tenantId, tenantId),
            ));

        return result[0].affectedRows > 0;
    }
}

export const intentRepository = new IntentRepository();
