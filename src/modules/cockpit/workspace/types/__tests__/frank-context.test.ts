import { describe, expect, it } from 'vitest';
import { buildFrankOperationalContext } from '../frank-context';
import type { CockpitActionQueueItem } from '../../../data/shared';

const mockQueueItem: CockpitActionQueueItem = {
    id: 'queue-conversation-5511999999999',
    queue: 'Conversas sem resposta',
    entity: 'Cliente Acme',
    waitingFor: 'Resposta sobre cotacao_frete',
    age: '20 min',
    owner: 'CX Ops',
    priority: 'warning',
    status: 'UNANSWERED',
    href: '/conversas?status=nova',
    category: 'conversation',
    timestamps: {
        createdAt: new Date().toISOString(),
        pendingMinutes: 20,
    },
    customer: {
        phone: '5511999999999',
        name: 'Cliente Acme',
    },
    conversation: {
        phoneKey: '5511999999999',
        status: 'UNANSWERED',
        lastIntent: 'cotacao_frete',
    },
    availableActions: [
        {
            id: 'assign_operator',
            label: 'Assumir Atendimento',
            type: 'api_put',
            endpoint: '/api/cockpit/conversations/5511999999999/assign',
        },
    ],
    operationalThread: {
        customer: { name: 'Cliente Acme', phone: '5511999999999' },
        conversation: { phoneKey: '5511999999999', lastIntent: 'cotacao_frete' },
        activeStage: 'atendimento',
        blockedStage: 'atendimento',
        blockReason: 'Aguardando operador',
    },
};

describe('FrankOperationalContext', () => {
    it('should build structured Frank context from a WorkItem', () => {
        const ctx = buildFrankOperationalContext(mockQueueItem, 'tenant-xyz');

        expect(ctx.tenantId).toBe('tenant-xyz');
        expect(ctx.activeWorkItemId).toBe(mockQueueItem.id);
        expect(ctx.category).toBe('conversation');
        expect(ctx.activeStage).toBe('atendimento');
        expect(ctx.blockedStage).toBe('atendimento');
        expect(ctx.availableActions).toEqual([
            { id: 'assign_operator', label: 'Assumir Atendimento' },
        ]);
    });

    it('should return empty context when WorkItem is null', () => {
        const ctx = buildFrankOperationalContext(null, 'tenant-xyz');

        expect(ctx.tenantId).toBe('tenant-xyz');
        expect(ctx.activeWorkItemId).toBeNull();
        expect(ctx.availableActions).toEqual([]);
    });
});
