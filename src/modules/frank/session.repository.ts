/**
 * Frank Session Repository.
 *
 * Manages persistent conversation state for each WhatsApp session.
 * Session key: tenantId + sessionId (typically phone hash).
 * Sessions expire after 30 minutes of inactivity.
 */

import { getDb } from '@/infra/db';
import { frankSessionState } from '@/drizzle/schema';
import { eq, and, gt } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { logger } from '@/infra/logger';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface SessionState {
    id: string;
    tenantId: string;
    sessionId: string;
    customerId: string | null;
    organizationId: string | null;
    currentIntent: string | null;
    currentStep: string | null;
    lastSimulationId: string | null;
    lastOrderId: string | null;
    lastReferencedShipmentId: string | null;
    lastReferencedQuoteId: string | null;
    lastReferencedCustomerId: string | null;
    lastToolUsed: string | null;
    autoResponsesCount: number;
    lastAutoResponseAt: Date | null;
    contextJson: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateSessionParams {
    customerId?: string | null;
    organizationId?: string | null;
    currentIntent?: string | null;
    currentStep?: string | null;
    lastSimulationId?: string | null;
    lastOrderId?: string | null;
    lastReferencedShipmentId?: string | null;
    lastReferencedQuoteId?: string | null;
    lastReferencedCustomerId?: string | null;
    lastToolUsed?: string | null;
    autoResponsesCount?: number;
    lastAutoResponseAt?: Date | null;
    contextJson?: Record<string, unknown> | null;
}

/**
 * Get active session state. Returns null if expired or not found.
 */
export async function getSessionState(
    tenantId: string,
    sessionId: string,
): Promise<SessionState | null> {
    const db = await getDb();
    const cutoff = new Date(Date.now() - SESSION_TTL_MS);

    const rows = await db.select()
        .from(frankSessionState)
        .where(and(
            eq(frankSessionState.tenantId, tenantId),
            eq(frankSessionState.sessionId, sessionId),
            gt(frankSessionState.updatedAt, cutoff),
        ))
        .limit(1);

    if (rows.length === 0) return null;

    return rows[0] as SessionState;
}

/**
 * Create a new session state entry.
 */
export async function createSessionState(
    tenantId: string,
    sessionId: string,
    params?: UpdateSessionParams,
): Promise<SessionState> {
    const db = await getDb();
    const id = randomUUID();

    await db.insert(frankSessionState).values({
        id,
        tenantId,
        sessionId,
        customerId: params?.customerId ?? null,
        organizationId: params?.organizationId ?? null,
        currentIntent: params?.currentIntent ?? null,
        currentStep: params?.currentStep ?? null,
        lastSimulationId: params?.lastSimulationId ?? null,
        lastOrderId: params?.lastOrderId ?? null,
        lastReferencedShipmentId: params?.lastReferencedShipmentId ?? null,
        lastReferencedQuoteId: params?.lastReferencedQuoteId ?? null,
        lastReferencedCustomerId: params?.lastReferencedCustomerId ?? null,
        lastToolUsed: params?.lastToolUsed ?? null,
        autoResponsesCount: params?.autoResponsesCount ?? 0,
        lastAutoResponseAt: params?.lastAutoResponseAt ?? null,
        contextJson: params?.contextJson ?? null,
    });

    logger.info('frank_session_created', { tenantId, sessionId, id });

    // Return the newly created state
    const created = await db.select()
        .from(frankSessionState)
        .where(eq(frankSessionState.id, id))
        .limit(1);

    return created[0] as SessionState;
}

/**
 * Update existing session state fields (partial update).
 */
export async function updateSessionState(
    tenantId: string,
    sessionId: string,
    params: UpdateSessionParams,
): Promise<void> {
    const db = await getDb();

    // Build update object - only include defined fields
    const updateData: Record<string, unknown> = {};
    if (params.customerId !== undefined) updateData.customerId = params.customerId;
    if (params.organizationId !== undefined) updateData.organizationId = params.organizationId;
    if (params.currentIntent !== undefined) updateData.currentIntent = params.currentIntent;
    if (params.currentStep !== undefined) updateData.currentStep = params.currentStep;
    if (params.lastSimulationId !== undefined) updateData.lastSimulationId = params.lastSimulationId;
    if (params.lastOrderId !== undefined) updateData.lastOrderId = params.lastOrderId;
    if (params.lastReferencedShipmentId !== undefined) updateData.lastReferencedShipmentId = params.lastReferencedShipmentId;
    if (params.lastReferencedQuoteId !== undefined) updateData.lastReferencedQuoteId = params.lastReferencedQuoteId;
    if (params.lastReferencedCustomerId !== undefined) updateData.lastReferencedCustomerId = params.lastReferencedCustomerId;
    if (params.lastToolUsed !== undefined) updateData.lastToolUsed = params.lastToolUsed;
    if (params.autoResponsesCount !== undefined) updateData.autoResponsesCount = params.autoResponsesCount;
    if (params.lastAutoResponseAt !== undefined) updateData.lastAutoResponseAt = params.lastAutoResponseAt;
    if (params.contextJson !== undefined) updateData.contextJson = params.contextJson;

    if (Object.keys(updateData).length === 0) return;

    await db.update(frankSessionState)
        .set(updateData)
        .where(and(
            eq(frankSessionState.tenantId, tenantId),
            eq(frankSessionState.sessionId, sessionId),
        ));

    logger.info('frank_session_updated', { tenantId, sessionId, fields: Object.keys(updateData) });
}

/**
 * Clear (delete) a session state entry.
 */
export async function clearSessionState(
    tenantId: string,
    sessionId: string,
): Promise<void> {
    const db = await getDb();

    await db.delete(frankSessionState)
        .where(and(
            eq(frankSessionState.tenantId, tenantId),
            eq(frankSessionState.sessionId, sessionId),
        ));

    logger.info('frank_session_cleared', { tenantId, sessionId });
}
