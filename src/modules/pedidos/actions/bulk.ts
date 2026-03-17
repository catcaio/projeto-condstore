'use server';

import { db } from '@/db/client';
import { orders } from '@/drizzle/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getTenantId } from '@/modules/audit/audit.actions';
import { operationalAuditService } from '@/modules/audit/operational-audit.service';
import { revalidatePath } from 'next/cache';

// ── Shared helper ──────────────────────────────────────────────────────────

interface BulkActionParams {
    orderIds: string[];
    setValues: Record<string, unknown>;
    actionType: string;
    auditState: Record<string, unknown>;
}

async function executeBulkAction({ orderIds, setValues, actionType, auditState }: BulkActionParams) {
    if (!orderIds.length) return { success: false };

    const tenantId = await getTenantId();

    await db.update(orders)
        .set({ ...setValues, updatedAt: new Date() })
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
            actionType,
            afterState: auditState,
            origin: 'bulk',
            actorId: 'Sistema'
        });
    }

    revalidatePath('/pedidos');
    return { success: true };
}

// ── Public actions ─────────────────────────────────────────────────────────

export async function bulkApproveOrders(orderIds: string[]) {
    return executeBulkAction({
        orderIds,
        setValues: { status: 'processando' },
        actionType: 'bulk_order_approved',
        auditState: { status: 'processando' },
    });
}

export async function bulkAssignOrderOwner(orderIds: string[], ownerId: string) {
    return executeBulkAction({
        orderIds,
        setValues: { ownerId },
        actionType: 'bulk_order_owner_assigned',
        auditState: { ownerId },
    });
}

export async function bulkCancelOrders(orderIds: string[]) {
    return executeBulkAction({
        orderIds,
        setValues: { status: 'cancelado' },
        actionType: 'bulk_order_cancelled',
        auditState: { status: 'cancelado' },
    });
}
