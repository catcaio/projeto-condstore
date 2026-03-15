import { ActionContext, createTask } from '../services/governance.service';
import { db } from '@/db/client';
import { governanceLists, governanceTasks } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Strategy for deduplication: We check if a task with the same sourceRef and sourceType already exists and is not archived.
async function getExistingTaskBySource(tenantId: string, sourceType: string, sourceRef: string) {
    const existing = await db.select().from(governanceTasks).where(and(
        eq(governanceTasks.tenantId, tenantId),
        eq(governanceTasks.sourceType, sourceType),
        eq(governanceTasks.sourceRef, sourceRef)
    )).limit(1);
    return existing[0] ?? null;
}

export async function handleCriticalOperationalEvent(tenantId: string, eventPayload: any) {
    const ctx: ActionContext = { tenantId, actorUserId: 'system' };
    const sourceRef = `evt_${eventPayload.id || Date.now()}`;
    
    if (await getExistingTaskBySource(tenantId, 'system', sourceRef)) return;

    const lists = await db.select().from(governanceLists).where(eq(governanceLists.tenantId, tenantId)).limit(1);
    if (!lists.length) return;

    await createTask(ctx, {
        projectId: lists[0].projectId,
        listId: lists[0].id,
        title: `Critical Event: ${eventPayload.type || 'Unknown'}`,
        description: `Auto-generated task from critical operational event.`,
        priority: 'urgent',
        sourceType: 'system',
        sourceRef,
    });
}

// Stub 2: Stagnant Conversation
export async function handleStagnantConversation(tenantId: string, conversationId: string, customerName: string) {
    const ctx: ActionContext = { tenantId, actorUserId: 'system' };
    const sourceRef = `conv_${conversationId}`;
    
    if (await getExistingTaskBySource(tenantId, 'system', sourceRef)) return;

    const lists = await db.select().from(governanceLists).where(eq(governanceLists.tenantId, tenantId)).limit(1);
    if (!lists.length) return;

    await createTask(ctx, {
        projectId: lists[0].projectId,
        listId: lists[0].id,
        title: `Follow-up: Stagnant Conversation with ${customerName}`,
        description: `Conversation ${conversationId} has been inactive for over 24h. Needs manual intervention.`,
        priority: 'high',
        sourceType: 'system',
        sourceRef,
    });
}

// Stub 3: Blocked Order SLA
export async function handleBlockedOrderSla(tenantId: string, orderId: string, slaHours: number) {
    const ctx: ActionContext = { tenantId, actorUserId: 'system' };
    const sourceRef = `ord_${orderId}_sla`;
    
    if (await getExistingTaskBySource(tenantId, 'system', sourceRef)) return;

    const lists = await db.select().from(governanceLists).where(eq(governanceLists.tenantId, tenantId)).limit(1);
    if (!lists.length) return;

    await createTask(ctx, {
        projectId: lists[0].projectId,
        listId: lists[0].id,
        title: `SLA Breach: Order #${orderId} blocked over ${slaHours}h`,
        description: `Order requires immediate logistical intervention.`,
        priority: 'urgent',
        sourceType: 'system',
        sourceRef,
    });
}
