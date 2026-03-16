'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/infra/db';
import { crmOpportunities } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import type { CrmStage } from '../types';

export async function updateClientOpportunityStage(opportunityId: string, newStage: CrmStage) {
    if (!opportunityId || !newStage) return;
    
    const db = await getDb();
    
    await db.update(crmOpportunities)
        .set({ 
            stage: newStage,
            updatedAt: new Date(),
            lastActivityAt: new Date()
        })
        .where(eq(crmOpportunities.id, opportunityId));

    revalidatePath('/cockpit/clientes');
    revalidatePath('/clientes');
}
