'use server';

import { db } from '@/db/client';
import { conversations, customers } from '@/drizzle/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getTenantId } from '@/modules/audit/audit.actions';
import { operationalAuditService } from '@/modules/audit/operational-audit.service';
import { revalidatePath } from 'next/cache';

export async function bulkAdvanceClientStage(clientIds: string[]) {
    if (!clientIds.length) return { success: false };
    const tenantId = await getTenantId();
    
    await db.update(conversations)
        .set({ stage: 'IN_ATTENDANCE', updatedAt: new Date() })
        .where(
            and(
                eq(conversations.tenantId, tenantId),
                inArray(conversations.customerId, clientIds)
            )
        );

    for (const id of clientIds) {
        await operationalAuditService.logActivity({
            tenantId,
            entityType: 'client',
            entityId: id,
            actionType: 'bulk_stage_advanced',
            afterState: { stage: 'IN_ATTENDANCE' },
            origin: 'bulk',
            actorId: 'Sistema'
        });
    }

    revalidatePath('/clientes');
    return { success: true };
}

export async function bulkAssignClientOwner(clientIds: string[], ownerId: string) {
    if (!clientIds.length) return { success: false };
    const tenantId = await getTenantId();
    
    await db.update(conversations)
        .set({ assignedTo: ownerId, updatedAt: new Date() })
        .where(
            and(
                eq(conversations.tenantId, tenantId),
                inArray(conversations.customerId, clientIds)
            )
        );

    for (const id of clientIds) {
        await operationalAuditService.logActivity({
            tenantId,
            entityType: 'client',
            entityId: id,
            actionType: 'bulk_owner_assigned',
            afterState: { ownerId },
            origin: 'bulk',
            actorId: 'Sistema'
        });
    }

    revalidatePath('/clientes');
    return { success: true };
}

export async function bulkArchiveClients(clientIds: string[]) {
    if (!clientIds.length) return { success: false };
    const tenantId = await getTenantId();
    
    await db.update(customers)
        .set({ status: 'inativo', updatedAt: new Date() })
        .where(
            and(
                eq(customers.tenantId, tenantId),
                inArray(customers.id, clientIds)
            )
        );

    for (const id of clientIds) {
        await operationalAuditService.logActivity({
            tenantId,
            entityType: 'client',
            entityId: id,
            actionType: 'bulk_client_archived',
            afterState: { status: 'inativo' },
            origin: 'bulk',
            actorId: 'Sistema'
        });
    }

    revalidatePath('/clientes');
    return { success: true };
}
