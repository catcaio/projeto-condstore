'use server';

import { db } from '@/db/client';
import { orders } from '@/drizzle/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getTenantId } from '@/modules/audit/audit.actions';
import { operationalAuditService } from '@/modules/audit/operational-audit.service';
import { revalidatePath } from 'next/cache';

export async function bulkApproveOrders(orderIds: string[]) {
    if (!orderIds.length) return { success: false };
    const tenantId = await getTenantId();
    
    await db.update(orders)
        .set({ status: 'processando', updatedAt: new Date() })
        .where(
            and(
                eq(orders.tenantId, tenantId),
                inArray(orders.id, orderIds)
            )
        );

    for (const id of orderIds) {
        await operationalAuditService.logActivity({
            tenantId,
            entityType: 'order',
            entityId: id,
            actionType: 'bulk_order_approved',
            afterState: { status: 'processando' },
            origin: 'bulk',
            actorId: 'Sistema'
        });
    }

    revalidatePath('/pedidos');
    return { success: true };
}

export async function bulkAssignOrderOwner(orderIds: string[], ownerId: string) {
    if (!orderIds.length) return { success: false };
    const tenantId = await getTenantId();
    
    await db.update(orders)
        .set({ ownerId: ownerId, updatedAt: new Date() })
        .where(
            and(
                eq(orders.tenantId, tenantId),
                inArray(orders.id, orderIds)
            )
        );

    for (const id of orderIds) {
        await operationalAuditService.logActivity({
            tenantId,
            entityType: 'order',
            entityId: id,
            actionType: 'bulk_order_owner_assigned',
            afterState: { ownerId },
            origin: 'bulk',
            actorId: 'Sistema'
        });
    }

    revalidatePath('/pedidos');
    return { success: true };
}

export async function bulkCancelOrders(orderIds: string[]) {
    if (!orderIds.length) return { success: false };
    const tenantId = await getTenantId();
    
    await db.update(orders)
        .set({ status: 'cancelado', updatedAt: new Date() })
        .where(
            and(
                eq(orders.tenantId, tenantId),
                inArray(orders.id, orderIds)
            )
        );

    for (const id of orderIds) {
        await operationalAuditService.logActivity({
            tenantId,
            entityType: 'order',
            entityId: id,
            actionType: 'bulk_order_cancelled',
            afterState: { status: 'cancelado' },
            origin: 'bulk',
            actorId: 'Sistema'
        });
    }

    revalidatePath('/pedidos');
    return { success: true };
}
