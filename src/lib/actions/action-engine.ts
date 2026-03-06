/**
 * action-engine.ts
 * Governed execution layer for tenant-level platform actions.
 *
 * Lifecycle: PROPOSED → APPROVED → EXECUTED (or REJECTED / FAILED)
 * - All actions start as PROPOSED
 * - Execution requires assertSupremePermission
 * - Execution writes operational events + structured audit logs
 * - No raw secrets or tokens in payload/result
 */

import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { supremeActions } from '@/drizzle/schema';
import { structuredLogger } from '@/infra/log/logger';
import { assertSupremePermission, SupremeForbiddenError } from '@/lib/governance/supreme-permissions';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import {
    isValidActionScope,
    ACTION_TYPE_TO_SCOPE,
    type ActionScope,
    type ActionStatus,
} from './action-types';

// ── Errors ────────────────────────────────────────────────────────────────────

export class ActionEngineError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ActionEngineError';
    }
}

// ── Scope → SupremePermission mapping ────────────────────────────────────────

import type { SupremePermissionScope } from '@/lib/governance/supreme-permissions';

const SCOPE_TO_PERMISSION: Record<ActionScope, SupremePermissionScope> = {
    ADS: 'ADS_BUDGET',
    CRM: 'CRM_ACTION',
    WHATSAPP: 'WHATSAPP_AUTOMATION',
    FREIGHT: 'EXECUTE_OPTIMIZATIONS',
    PRICING: 'EXECUTE_OPTIMIZATIONS',
};

// ── Input Types ───────────────────────────────────────────────────────────────

export interface ProposeActionInput {
    tenantId: string;
    actionType: string;
    actionScope: ActionScope;
    proposedBy: string;
    payload: Record<string, unknown>;
}

export interface ActionListFilter {
    status?: ActionStatus;
    scope?: ActionScope;
    limit?: number;
}

// ── proposeAction ─────────────────────────────────────────────────────────────

export async function proposeAction(input: ProposeActionInput) {
    const { tenantId, actionType, actionScope, proposedBy, payload } = input;

    if (!tenantId?.trim()) throw new ActionEngineError('tenantId is required');
    if (!actionType?.trim()) throw new ActionEngineError('actionType is required');
    if (!isValidActionScope(actionScope)) {
        throw new ActionEngineError(`Unknown action scope: "${actionScope}"`);
    }

    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(supremeActions).values({
        id,
        tenantId,
        actionType,
        actionScope,
        status: 'PROPOSED',
        proposedBy,
        payload,
        createdAt: now,
    });

    structuredLogger.info('action_proposed', {
        eventType: 'action_proposed',
        tenantId,
        actionId: id,
        actionType,
        actionScope,
        proposedBy,
    });

    void publishOperationalEvent({
        tenantId,
        eventType: 'action_proposed',
        eventDomain: 'OPERATIONS',
        entityId: id,
        payload: { actionType, actionScope },
    });

    return { id, status: 'PROPOSED' as ActionStatus, createdAt: now };
}

// ── approveAction ─────────────────────────────────────────────────────────────

export async function approveAction(tenantId: string, actionId: string, approvedBy: string) {
    const db = await getDb();
    const rows = await db
        .select()
        .from(supremeActions)
        .where(and(eq(supremeActions.id, actionId), eq(supremeActions.tenantId, tenantId)))
        .limit(1);

    const action = rows[0];
    if (!action) throw new ActionEngineError(`Action ${actionId} not found`);
    if (action.status !== 'PROPOSED') {
        throw new ActionEngineError(`Cannot approve action in status ${action.status}`);
    }

    const now = new Date();
    await db
        .update(supremeActions)
        .set({ status: 'APPROVED', approvedBy, approvedAt: now })
        .where(eq(supremeActions.id, actionId));

    structuredLogger.info('action_approved', {
        eventType: 'action_approved',
        tenantId,
        actionId,
        approvedBy,
    });

    void publishOperationalEvent({
        tenantId,
        eventType: 'action_approved',
        eventDomain: 'OPERATIONS',
        entityId: actionId,
        payload: { approvedBy },
    });

    return { id: actionId, status: 'APPROVED' as ActionStatus, approvedAt: now };
}

// ── rejectAction ──────────────────────────────────────────────────────────────

export async function rejectAction(tenantId: string, actionId: string, rejectedBy: string) {
    const db = await getDb();
    const rows = await db
        .select()
        .from(supremeActions)
        .where(and(eq(supremeActions.id, actionId), eq(supremeActions.tenantId, tenantId)))
        .limit(1);

    const action = rows[0];
    if (!action) throw new ActionEngineError(`Action ${actionId} not found`);
    if (!['PROPOSED', 'APPROVED'].includes(action.status)) {
        throw new ActionEngineError(`Cannot reject action in status ${action.status}`);
    }

    await db
        .update(supremeActions)
        .set({ status: 'REJECTED', approvedBy: rejectedBy, approvedAt: new Date() })
        .where(eq(supremeActions.id, actionId));

    structuredLogger.info('action_rejected', {
        eventType: 'action_rejected',
        tenantId,
        actionId,
        rejectedBy,
    });

    void publishOperationalEvent({
        tenantId,
        eventType: 'action_rejected',
        eventDomain: 'OPERATIONS',
        entityId: actionId,
        payload: { rejectedBy },
    });

    return { id: actionId, status: 'REJECTED' as ActionStatus };
}

// ── executeAction ─────────────────────────────────────────────────────────────

export async function executeAction(tenantId: string, actionId: string, executedBy: string) {
    const db = await getDb();
    const rows = await db
        .select()
        .from(supremeActions)
        .where(and(eq(supremeActions.id, actionId), eq(supremeActions.tenantId, tenantId)))
        .limit(1);

    const action = rows[0];
    if (!action) throw new ActionEngineError(`Action ${actionId} not found`);
    if (action.status !== 'APPROVED') {
        throw new ActionEngineError(`Cannot execute action in status ${action.status}. Must be APPROVED first.`);
    }

    const scope = (action.actionScope as ActionScope);
    const requiredPermission = SCOPE_TO_PERMISSION[scope];

    // Governance check — throws SupremeForbiddenError if denied
    await assertSupremePermission(tenantId, requiredPermission);

    const now = new Date();
    const result: Record<string, unknown> = {
        executedAt: now.toISOString(),
        executedBy,
        note: 'Action dispatched to execution layer',
    };

    try {
        await db
            .update(supremeActions)
            .set({ status: 'EXECUTED', executedBy, executedAt: now, result })
            .where(eq(supremeActions.id, actionId));

        structuredLogger.info('action_executed', {
            eventType: 'action_executed',
            tenantId,
            actionId,
            actionType: action.actionType,
            actionScope: scope,
            executedBy,
        });

        void publishOperationalEvent({
            tenantId,
            eventType: 'action_executed',
            eventDomain: 'OPERATIONS',
            entityId: actionId,
            payload: { actionType: action.actionType, actionScope: scope, executedBy },
        });

        return { id: actionId, status: 'EXECUTED' as ActionStatus, executedAt: now, result };
    } catch (err) {
        const failResult = { failedAt: now.toISOString(), error: err instanceof Error ? err.message : String(err) };
        await db
            .update(supremeActions)
            .set({ status: 'FAILED', executedAt: now, result: failResult })
            .where(eq(supremeActions.id, actionId));

        structuredLogger.error('action_failed', {
            eventType: 'action_failed',
            tenantId,
            actionId,
            error: err,
        });

        void publishOperationalEvent({
            tenantId,
            eventType: 'action_failed',
            eventDomain: 'OPERATIONS',
            entityId: actionId,
            payload: { error: (err instanceof Error ? err.message : String(err)) },
        });

        return { id: actionId, status: 'FAILED' as ActionStatus, executedAt: now, result: failResult };
    }
}

// ── listTenantActions ─────────────────────────────────────────────────────────

export async function listTenantActions(tenantId: string, filter: ActionListFilter = {}) {
    const db = await getDb();
    const limit = Math.min(filter.limit ?? 50, 200);

    const conditions = [eq(supremeActions.tenantId, tenantId)];
    if (filter.status) conditions.push(eq(supremeActions.status, filter.status));
    if (filter.scope) conditions.push(eq(supremeActions.actionScope, filter.scope));

    const rows = await db
        .select()
        .from(supremeActions)
        .where(and(...conditions))
        .orderBy(desc(supremeActions.createdAt))
        .limit(limit);

    return rows;
}
