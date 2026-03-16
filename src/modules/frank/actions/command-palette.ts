'use server';

import { db } from '@/db/client';
import { conversations, orders, shipments } from '@/drizzle/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';

// Mock Tenant ID for the operational environment
const DEMO_TENANT_ID = 'tenant-demo-lojacond-001';

export async function createQuickOpportunity() {
    const newId = uuidv4();
    await db.insert(conversations).values({
        id: newId,
        tenantId: DEMO_TENANT_ID,
        phoneHash: `quick_opp_${Date.now()}`,
        phoneEncrypted: 'quick_encrypted',
        channel: 'WHATSAPP',
        status: 'new',
        stage: 'NEW_LEAD',
    });
    revalidatePath('/clientes');
    return { success: true, message: 'Nova oportunidade criada no CRM.' };
}

export async function approveAllPendingOrders() {
    const result = await db.update(orders)
        .set({ status: 'producao', updatedAt: new Date() })
        .where(
            and(
                eq(orders.tenantId, DEMO_TENANT_ID),
                inArray(orders.status, ['recebido', 'validacao'])
            )
        );
    revalidatePath('/pedidos');
    return { success: true, message: 'Todas as pendências de pedidos foram aprovadas.' };
}

export async function forceTrackingSync() {
    const result = await db.update(shipments)
        .set({ status: 'IN_TRANSIT', updatedAt: new Date() })
        .where(
            and(
                eq(shipments.tenantId, DEMO_TENANT_ID),
                eq(shipments.status, 'CREATED')
            )
        );
    revalidatePath('/logistica');
    return { success: true, message: 'Tracking sincronizado e atualizado.' };
}
