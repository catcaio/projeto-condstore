import { ActionContext, createTask } from '../services/governance.service';
import { db } from '@/db/client';
import { governanceLists } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function handleCriticalOperationalEvent(tenantId: string, eventPayload: any) {
    const ctx: ActionContext = {
        tenantId,
        actorUserId: 'system', // Indicates a system-generated action
    };

    // 1. Find a default operations project/list or create one (Simplified for base)
    const lists = await db.select().from(governanceLists)
        .where(eq(governanceLists.tenantId, tenantId)).limit(1);
        
    if (lists.length === 0) {
        console.warn('No governance list found to create critical operational task');
        return;
    }
    
    const targetList = lists[0];

    // 2. Create the task dynamically
    await createTask(ctx, {
        projectId: targetList.projectId,
        listId: targetList.id,
        title: `Critical Event: ${eventPayload.type || 'Unknown'}`,
        description: `Auto-generated task from critical operational event. Context: ${JSON.stringify(eventPayload)}`,
        priority: 'urgent',
        sourceType: 'system',
        sourceRef: eventPayload.id || undefined,
    });
}
