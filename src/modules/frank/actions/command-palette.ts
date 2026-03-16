'use server';

import { db } from '@/db/client';
import { conversations, orders, shipments } from '@/drizzle/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { getTenantId } from '@/modules/audit/audit.actions';
import { operationalAuditService } from '@/modules/audit/operational-audit.service';

export async function createQuickOpportunity() {
    const tenantId = await getTenantId();
    const newId = uuidv4();
    await db.insert(conversations).values({
        id: newId,
        tenantId,
        phoneHash: `manual_${Date.now()}`,
        phoneEncrypted: 'quick_encrypted',
        channel: 'WHATSAPP',
        status: 'new',
        stage: 'NEW_LEAD',
    });
    
    await operationalAuditService.logActivity({
        tenantId,
        entityType: 'conversation', // We'll map to conversation right now
        entityId: newId,
        actionType: 'quick_opportunity_created',
        origin: 'palette',
        actorId: 'Sistema'
    });

    revalidatePath('/clientes');
    return { success: true, message: 'Nova oportunidade criada no CRM.' };
}

export async function approveAllPendingOrders() {
    const tenantId = await getTenantId();
    const ordersToApprove = await db.select({ id: orders.id })
        .from(orders)
        .where(
            and(
                eq(orders.tenantId, tenantId),
                inArray(orders.status, ['recebido', 'validacao'])
            )
        );

    if (ordersToApprove.length > 0) {
        await db.update(orders)
            .set({ status: 'producao', updatedAt: new Date() })
            .where(
                and(
                    eq(orders.tenantId, tenantId),
                    inArray(orders.status, ['recebido', 'validacao'])
                )
            );

        for (const row of ordersToApprove) {
            await operationalAuditService.logActivity({
                tenantId,
                entityType: 'order',
                entityId: row.id,
                actionType: 'order_approved',
                afterState: { status: 'producao' },
                origin: 'palette',
                actorId: 'Sistema'
            });
        }
    }

    revalidatePath('/pedidos');
    return { success: true, message: 'Todas as pendências de pedidos foram aprovadas.' };
}

export async function forceTrackingSync() {
    const tenantId = await getTenantId();
    const shipmentsToSync = await db.select({ id: shipments.id })
        .from(shipments)
        .where(
            and(
                eq(shipments.tenantId, tenantId),
                eq(shipments.status, 'CREATED')
            )
        );

    if (shipmentsToSync.length > 0) {
        await db.update(shipments)
            .set({ status: 'IN_TRANSIT', updatedAt: new Date() })
            .where(
                and(
                    eq(shipments.tenantId, tenantId),
                    eq(shipments.status, 'CREATED')
                )
            );

        for (const row of shipmentsToSync) {
            await operationalAuditService.logActivity({
                tenantId,
                entityType: 'shipment',
                entityId: row.id,
                actionType: 'tracking_sync_forced',
                afterState: { status: 'IN_TRANSIT' },
                origin: 'palette',
                actorId: 'Sistema'
            });
        }
    }

    revalidatePath('/logistica');
    return { success: true, message: 'Tracking sincronizado e atualizado.' };
}
