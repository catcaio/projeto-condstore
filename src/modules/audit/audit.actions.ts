'use server';

import { operationalAuditService, OperationalEntityType } from './operational-audit.service';
import { cookies } from 'next/headers';

/**
 * Helper strictly for the Next.js App Router boundary to get tenant ID.
 * Since we are inside the authenticated workspace, we assume a tenant cookie or internal token is present.
 */
export async function getTenantId(): Promise<string> {
    const cookieStore = await cookies();
    const tenantId = cookieStore.get('tenantId')?.value || 'local-qa-tenant';
    return tenantId;
}

export async function getOperationalHistoryAction(entityType: OperationalEntityType, entityId: string, limit = 20) {
    const tenantId = await getTenantId();
    const history = await operationalAuditService.getHistoryForEntity(tenantId, entityType, entityId, limit);
    return history;
}

export async function addOperationalNoteAction(entityType: OperationalEntityType, entityId: string, note: string) {
    const tenantId = await getTenantId();
    await operationalAuditService.logActivity({
        tenantId,
        entityType,
        entityId,
        actionType: 'note_added',
        afterState: { note },
        origin: 'drawer',
        actorId: 'user' // Placeholder, in real app we'd get from session
    });
}
