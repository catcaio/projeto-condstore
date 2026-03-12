import { getDb } from '@/infra/db';
import { frankIntentTraining, type FrankIntentTrainingRecord } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export class IntentLinkerRepository {
    async updateLinkStatus(
        tenantId: string,
        intentId: string,
        playbookId: string,
        linkStatus: 'linked' | 'converted_to_playbook'
    ): Promise<boolean> {
        const db = await getDb();

        const result = await db.update(frankIntentTraining)
            .set({ 
                playbookId,
                linkStatus,
            })
            .where(and(
                eq(frankIntentTraining.id, intentId),
                eq(frankIntentTraining.tenantId, tenantId),
            ));

        return result[0].affectedRows > 0;
    }
}

export const intentLinkerRepository = new IntentLinkerRepository();
