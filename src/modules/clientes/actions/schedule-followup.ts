'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { getTenantId } from '@/modules/audit/audit.actions';
import { crmRepository } from '@/modules/crm/crm.repository';
import { operationalAuditService } from '@/modules/audit/operational-audit.service';

export async function scheduleClientFollowUp(customerId: string) {
    if (!customerId) return { success: false, error: 'Customer ID is required' };

    try {
        const tenantId = await getTenantId();

        // 1. Find or create an active opportunity
        let activeOp = await crmRepository.findActiveOpportunity(tenantId, customerId);
        let opportunityId: string;

        if (!activeOp) {
            opportunityId = randomUUID();
            await crmRepository.createOpportunity({
                id: opportunityId,
                tenantId,
                customerId,
                title: 'Acompanhamento Manual',
                stage: 'new_lead',
                status: 'active',
                lastActivityAt: new Date(),
                createdAt: new Date(),
            });
        } else {
            opportunityId = activeOp.id;
        }

        // 2. Create follow-up (48h from now)
        const followUpId = randomUUID();
        const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        await crmRepository.createFollowUp({
            id: followUpId,
            tenantId,
            opportunityId,
            scheduledAt,
            description: 'Follow-up agendado manualmente via listagem de clientes',
            status: 'pending',
            createdAt: new Date(),
        });

        // 3. Log activity
        await operationalAuditService.logActivity({
            tenantId,
            entityType: 'client',
            entityId: customerId,
            actionType: 'followup_scheduled',
            afterState: { followUpId, scheduledAt, opportunityId },
            origin: 'ui',
            actorId: 'Sistema'
        });

        revalidatePath('/clientes');
        revalidatePath('/cockpit/clientes');

        return { success: true, scheduledAt: scheduledAt.toISOString() };
    } catch (error) {
        console.error('Failed to schedule follow-up:', error);
        return { success: false, error: 'Erro ao agendar follow-up' };
    }
}
