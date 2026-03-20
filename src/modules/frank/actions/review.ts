'use server';

import { db } from '@/db/client';
import { frankActions, operationalAuditLogs } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getTenantId } from '@/modules/audit/audit.actions';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { FrankActionType, getActionSchema } from '../action-contracts';
import { ZodError } from 'zod';
import { withTenantIdNotDeleted } from '@/infra/db';

export type ActionResponse = {
    success: boolean;
    error?: string;
    code?: 'UNAUTHORIZED' | 'NOT_FOUND' | 'PAYLOAD_INVALID' | 'STATE_CONFLICT' | 'EXECUTION_FAILED';
};

// ==========================================
// 1. Fetching Frank Actions
// ==========================================
export async function getPendingFrankActions(entityType: string, entityId: string) {
    const tenantId = await getTenantId();
    if (!tenantId) throw new Error('Tenant não encontrado');

    const actions = await db
        .select()
        .from(frankActions)
        .where(
            and(
                eq(frankActions.tenantId, tenantId),
                eq(frankActions.entityType, entityType),
                eq(frankActions.entityId, entityId),
                eq(frankActions.status, 'review_required') // Only pending approval
            )
        )
        .orderBy(desc(frankActions.createdAt));

    return actions;
}

// ==========================================
// 2. Rejecting Action
// ==========================================
export async function rejectFrankAction(actionId: string): Promise<ActionResponse> {
    const tenantId = await getTenantId();
    if (!tenantId) return { success: false, error: 'Tenant ID missing', code: 'UNAUTHORIZED' };

    const [actionRecord] = await db
        .select()
        .from(frankActions)
        .where(and(eq(frankActions.id, actionId), eq(frankActions.tenantId, tenantId)));

    if (!actionRecord) return { success: false, error: 'Action not found', code: 'NOT_FOUND' };
    if (actionRecord.status !== 'review_required' && actionRecord.status !== 'draft') {
        return { success: false, error: 'Cannot reject action in current state: ' + actionRecord.status, code: 'STATE_CONFLICT' };
    }

    await db.update(frankActions)
        .set({ status: 'rejected', updatedAt: new Date() })
        .where(and(eq(frankActions.id, actionId), eq(frankActions.tenantId, tenantId)));
    
    revalidatePath('/', 'layout');
    return { success: true };
}

// ==========================================
// 3. Approving & Executing Action
// ==========================================
export async function approveAndExecuteFrankAction(actionId: string, payloadOverride: any): Promise<ActionResponse> {
    const tenantId = await getTenantId();
    if (!tenantId) return { success: false, error: 'Tenant ID missing', code: 'UNAUTHORIZED' };

    const [actionRecord] = await db
        .select()
        .from(frankActions)
        .where(and(eq(frankActions.id, actionId), eq(frankActions.tenantId, tenantId)));

    if (!actionRecord) {
        return { success: false, error: 'Action not found.', code: 'NOT_FOUND' };
    }
    
    if (actionRecord.status !== 'review_required') {
        return { success: false, error: `Não é possível aprovar uma ação no estado '${actionRecord.status}'.`, code: 'STATE_CONFLICT' };
    }

    // 1. Validate payload against strict Zod Schema
    const schema = getActionSchema(actionRecord.type as FrankActionType);
    if (!schema) {
        return { success: false, error: `Contrato Zod inexistente para o tipo: ${actionRecord.type}`, code: 'EXECUTION_FAILED' };
    }

    let validatedPayload;
    try {
        validatedPayload = schema.parse(payloadOverride);
    } catch (e: any) {
        if (e && e.errors) {
            return { success: false, error: 'Payload inválido: ' + e.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', '), code: 'PAYLOAD_INVALID' };
        }
        return { success: false, error: 'Payload validation failed', code: 'PAYLOAD_INVALID' };
    }

    // 2. Mark as executing
    await db.update(frankActions)
        .set({ status: 'executing', payload: validatedPayload, updatedAt: new Date() })
        .where(eq(frankActions.id, actionId));

    try {
        // 3. ACTUAL EXECUTION (Dynamic Dispatcher)
        await executeDomainAction(actionRecord.type as FrankActionType, validatedPayload, tenantId);

        // 4. Mark as executed
        await db.update(frankActions)
            .set({ status: 'executed', updatedAt: new Date() })
            .where(eq(frankActions.id, actionId));

        // 5. Generate Official Audit Log
        await db.insert(operationalAuditLogs).values({
            id: uuidv4(),
            tenantId,
            entityType: actionRecord.entityType,
            entityId: actionRecord.entityId,
            actionType: actionRecord.type,
            actorId: 'Usuario (via Frank)',
            origin: 'frank',
            metadata: {
                frankActionId: actionId,
                explanation: actionRecord.explanation
            },
            afterState: validatedPayload,
        });

    } catch (error: any) {
        // Handle Error + Rollback representation
        await db.update(frankActions)
            .set({ status: 'failed', errorMsg: error.message, updatedAt: new Date() })
            .where(eq(frankActions.id, actionId));
        
        return { success: false, error: `Ação falhou durante execução: ${error.message}`, code: 'EXECUTION_FAILED' };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}

import { conversations, orders, shipments } from '@/drizzle/schema';

// ==========================================
// Dispatcher Stub (To be wired to actual modules eventually)
// ==========================================
async function executeDomainAction(type: FrankActionType, payload: any, tenantId: string) {
    console.info(`[EXECUTING FRANK ACTION] ${type}`, payload);

    try {
        switch (type) {
            case 'crm_move_opportunity_stage':
                await db.update(conversations)
                    .set({ stage: payload.newStage.toUpperCase(), updatedAt: new Date() })
                    .where(and(eq(conversations.id, payload.opportunityId), eq(conversations.tenantId, tenantId)));
                break;
            case 'crm_assign_opportunity_owner':
                await db.update(conversations)
                    .set({ assignedTo: payload.newOwnerId, updatedAt: new Date() })
                    .where(and(eq(conversations.id, payload.opportunityId), eq(conversations.tenantId, tenantId)));
                break;
            case 'order_update_status':
                await db.update(orders)
                    .set({ status: payload.newStatus, updatedAt: new Date() })
                    .where(withTenantIdNotDeleted(orders, tenantId, payload.orderId));
                break;
            case 'order_assign_owner':
                await db.update(orders)
                    .set({ ownerId: payload.newOwnerId, updatedAt: new Date() })
                    .where(withTenantIdNotDeleted(orders, tenantId, payload.orderId));
                break;
            case 'logistics_update_shipment_status':
                await db.update(shipments)
                    .set({ status: payload.newStatus.toUpperCase(), updatedAt: new Date() })
                    .where(withTenantIdNotDeleted(shipments, tenantId, payload.shipmentId));
                break;
            case 'conversation_assign_owner':
                await db.update(conversations)
                    .set({ assignedTo: payload.newOwnerId, updatedAt: new Date() })
                    .where(and(eq(conversations.id, payload.conversationId), eq(conversations.tenantId, tenantId)));
                break;
            // Additional actions can be gracefully handled here.
            default:
                console.info(`Action type ${type} executed successfully (no strict domain wiring yet).`);
                break;
        }
    } catch (e) {
        console.error(`Error executing domain action ${type}:`, e);
        throw e;
    }
}
