'use server';

import { revalidatePath } from 'next/cache';
import { getDb, withTenantIdNotDeleted } from '@/infra/db';
import { crmOpportunities } from '@/drizzle/schema';
import type { CrmStage } from '../types';
import { getTenantId } from '@/modules/audit/audit.actions';

export async function updateClientOpportunityStage(opportunityId: string, newStage: CrmStage) {
    if (!opportunityId || !newStage) return;
    
    const tenantId = await getTenantId();
    const db = await getDb();
    
    await db.update(crmOpportunities)
        .set({ 
            stage: newStage,
            updatedAt: new Date(),
            lastActivityAt: new Date()
        })
        .where(withTenantIdNotDeleted(crmOpportunities, tenantId, opportunityId));

    revalidatePath('/cockpit/clientes');
    revalidatePath('/clientes');
}
