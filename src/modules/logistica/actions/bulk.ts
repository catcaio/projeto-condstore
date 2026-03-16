'use server';

import { db } from '@/db/client';
import { shipments } from '@/drizzle/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getTenantId } from '@/modules/audit/audit.actions';
import { operationalAuditService } from '@/modules/audit/operational-audit.service';
import { revalidatePath } from 'next/cache';

export async function bulkSyncLogisticsTracking(shipmentIds: string[]) {
    if (!shipmentIds.length) return { success: false };
    const tenantId = await getTenantId();
    
    await db.update(shipments)
        .set({ status: 'IN_TRANSIT', updatedAt: new Date() })
        .where(
            and(
                eq(shipments.tenantId, tenantId),
                inArray(shipments.id, shipmentIds)
            )
        );

    for (const id of shipmentIds) {
        await operationalAuditService.logActivity({
            tenantId,
            entityType: 'shipment',
            entityId: id,
            actionType: 'bulk_tracking_synced',
            afterState: { status: 'IN_TRANSIT' },
            origin: 'bulk',
            actorId: 'Sistema'
        });
    }

    revalidatePath('/logistica');
    return { success: true };
}

export async function bulkReportLogisticsException(shipmentIds: string[]) {
    if (!shipmentIds.length) return { success: false };
    const tenantId = await getTenantId();
    
    await db.update(shipments)
        .set({ status: 'EXCEPTION', updatedAt: new Date() })
        .where(
            and(
                eq(shipments.tenantId, tenantId),
                inArray(shipments.id, shipmentIds)
            )
        );

    for (const id of shipmentIds) {
        await operationalAuditService.logActivity({
            tenantId,
            entityType: 'shipment',
            entityId: id,
            actionType: 'bulk_exception_reported',
            afterState: { status: 'EXCEPTION' },
            origin: 'bulk',
            actorId: 'Sistema'
        });
    }

    revalidatePath('/logistica');
    return { success: true };
}
