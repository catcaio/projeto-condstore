import { describe, expect, it } from 'vitest';
import { getCockpitQueues } from '../../data/get-cockpit-queues';
import type { CockpitRawData } from '../../data/shared';
import { buildFrankOperationalContext } from '../types/frank-context';

const mockRawDataNoRelations: CockpitRawData = {
    context: {
        tenantId: 'tenant-strict-test',
        role: 'operator',
        userId: 'user-op-1',
        tenantName: 'Strict Tenant',
        timezone: 'America/Sao_Paulo',
    },
    partialBlocks: [],
    generatedAt: new Date().toISOString(),
    diagSnapshot: null,
    systemStatusPayload: null,
    recentMessages: [],
    recentSimulations: [],
    recentOrders: [
        {
            orderId: 'ORD-UNMATCHED-99',
            status: 'EM_ANALISE',
            totals: { total: 250 },
            updatedAt: new Date().toISOString(),
        },
    ],
    recentFreightQuotes: [
        {
            correlationId: 'QUOTE-UNMATCHED-88',
            bestCarrier: 'LogExpress',
            bestPriceCents: 1200,
            bestEtaDays: 2,
            createdAt: new Date().toISOString(),
        },
    ],
    recentShipments: [
        {
            id: 'SHIP-UNMATCHED-77',
            carrier: 'LogExpress',
            service: 'Padrao',
            status: 'EM_TRANSITO',
            trackingCode: 'TRK999',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ],
    recentOperationalEvents: [],
    recentDomineEvents: [],
    activeIncidents: [],
    failedWebhookEvents: [],
    derived: {
        metricsSnapshot: {
            activeConversationCount: 1,
            unansweredConversationCount: 1,
            processingOrderCount: 1,
            pendingOrdersCount: 1,
            simulationsToday: 1,
            pendingFreightCount: 1,
            errorsAndExceptions: 0,
            activeIncidentCount: 0,
            failedDomineEventsCount: 0,
            failedWebhookEventsCount: 0,
            criticalSystemCount: 0,
        },
        routeHints: {
            conversationsHref: '/conversas',
            ordersHref: '/pedidos',
            logisticsHref: '/logistica',
            exceptionsHref: '/logistica?excecao=true',
            simulatorHref: '/logistica/simulador',
            metricsHref: '/metricas',
        },
        unansweredConversations: [
            {
                phoneKey: '5511988887777',
                actorLabel: 'Cliente Sem Vinculo',
                lastInboundAt: new Date().toISOString(),
                lastOutboundAt: null,
                lastActivityAt: new Date().toISOString(),
                lastIntent: 'duvida_frete',
                pendingMinutes: 15,
            },
        ],
        pendingOrders: [
            {
                orderId: 'ORD-UNMATCHED-99',
                status: 'EM_ANALISE',
                updatedAt: new Date().toISOString(),
                valueLabel: 'R$ 250',
            },
        ],
        pendingFreight: [],
    },
};

describe('Cockpit V2 Parte 3 — Guarantees & Verification', () => {
    it('MUST NOT perform heuristic array[0] fallbacks between unrelated domain entities', () => {
        const items = getCockpitQueues(mockRawDataNoRelations);

        const conversationItem = items.find((i) => i.id === 'queue-conversation-5511988887777');
        expect(conversationItem).toBeDefined();

        // Strict assertion: quotation, order and shipment MUST NOT be inferred from array[0]
        expect(conversationItem?.quotation).toBeUndefined();
        expect(conversationItem?.order).toBeUndefined();
        expect(conversationItem?.shipment).toBeUndefined();
    });

    it('MUST NOT force matching shipment on order if IDs do not correlate', () => {
        const items = getCockpitQueues(mockRawDataNoRelations);

        const orderItem = items.find((i) => i.id === 'queue-order-ORD-UNMATCHED-99');
        expect(orderItem).toBeDefined();
        // Since SHIP-UNMATCHED-77 does not contain ORD-UNMATCHED-99, shipment should be undefined
        expect(orderItem?.shipment).toBeUndefined();
    });

    it('builds structured Frank context cleanly from a WorkItem', () => {
        const items = getCockpitQueues(mockRawDataNoRelations);
        const conversationItem = items.find((i) => i.id === 'queue-conversation-5511988887777')!;

        const frankContext = buildFrankOperationalContext(conversationItem, 'tenant-strict-test');

        expect(frankContext.tenantId).toBe('tenant-strict-test');
        expect(frankContext.activeWorkItemId).toBe('queue-conversation-5511988887777');
        expect(frankContext.category).toBe('conversation');
        expect(frankContext.customer?.phone).toBe('5511988887777');
        expect(frankContext.availableActions.length).toBeGreaterThan(0);
    });
});
