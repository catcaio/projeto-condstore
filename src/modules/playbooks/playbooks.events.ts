import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

export async function emitPlaybookCreated(params: { tenantId: string; playbookId: string; playbookName: string; operatorId?: string }) {
    await publishOperationalEvent({
        tenantId: params.tenantId,
        eventType: 'playbook_created',
        eventDomain: 'OPERATIONS',
        entityId: params.playbookId,
        payload: {
            playbookName: params.playbookName,
            operatorId: params.operatorId
        }
    });
}

export async function emitPlaybookUpdated(params: { tenantId: string; playbookId: string; playbookName: string; operatorId?: string }) {
    await publishOperationalEvent({
        tenantId: params.tenantId,
        eventType: 'playbook_updated',
        eventDomain: 'OPERATIONS',
        entityId: params.playbookId,
        payload: {
            playbookName: params.playbookName,
            operatorId: params.operatorId
        }
    });
}

export async function emitPlaybookExecuted(params: { tenantId: string; playbookId: string; entityId: string; contextId?: string; operatorId?: string }) {
    await publishOperationalEvent({
        tenantId: params.tenantId,
        eventType: 'playbook_executed',
        eventDomain: 'OPERATIONS',
        entityId: params.entityId,
        payload: {
            playbookId: params.playbookId,
            contextId: params.contextId,
            operatorId: params.operatorId
        }
    });
}
