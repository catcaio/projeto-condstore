import { describe, expect, it } from 'vitest';
import { getCockpitQueues } from '../get-cockpit-queues';
import type { CockpitRawData } from '../shared';

const mockRawData: CockpitRawData = {
    context: {
        tenantId: 'tenant-test-123',
        role: 'admin',
        userId: 'user-123',
        tenantName: 'Test Tenant',
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
            orderId: 'ORD-1001',
            status: 'EM_ANALISE_CREDITO',
            totals: { total: 1500.00 },
            updatedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        },
    ],
    recentFreightQuotes: [
        {
            correlationId: 'QUOTE-2002',
            bestCarrier: 'Express Log',
            bestPriceCents: 4500,
            bestEtaDays: 3,
            createdAt: new Date().toISOString(),
        },
    ],
    recentShipments: [
        {
            id: 'SHIP-3003',
            carrier: 'Express Log',
            service: 'Expresso',
            status: 'EM_TRANSITO',
            trackingCode: 'TRK123456',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ],
    recentOperationalEvents: [],
    recentDomineEvents: [],
    activeIncidents: [
        {
            id: 'INC-4004',
            type: 'WEBHOOK_TIMEOUT',
            startedAt: new Date().toISOString(),
            triggeredBy: 'Stripe Connector',
        },
    ],
    failedWebhookEvents: [],
    derived: {
        metricsSnapshot: {
            activeConversationCount: 1,
            unansweredConversationCount: 1,
            processingOrderCount: 1,
            pendingOrdersCount: 1,
            simulationsToday: 5,
            pendingFreightCount: 1,
            errorsAndExceptions: 1,
            activeIncidentCount: 1,
            failedDomineEventsCount: 0,
            failedWebhookEventsCount: 0,
            criticalSystemCount: 0,
        },
        routeHints: {
            conversationsHref: '/conversas?status=nova',
            ordersHref: '/pedidos?status=em-analise',
            logisticsHref: '/logistica',
            exceptionsHref: '/logistica?excecao=true',
            simulatorHref: '/logistica/simulador',
            metricsHref: '/metricas',
        },
        unansweredConversations: [
            {
                phoneKey: '5511999999999',
                actorLabel: 'Cliente Acme',
                lastInboundAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
                lastOutboundAt: null,
                lastActivityAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
                lastIntent: 'cotacao_frete',
                pendingMinutes: 50,
            },
        ],
        pendingOrders: [
            {
                orderId: 'ORD-1001',
                status: 'EM_ANALISE_CREDITO',
                updatedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
                valueLabel: 'R$ 1.500',
            },
        ],
        pendingFreight: [
            {
                id: 'SHIP-3003',
                kind: 'shipment',
                carrier: 'Express Log',
                status: 'EM_TRANSITO',
                createdAt: new Date().toISOString(),
            },
        ],
    },
};

describe('getCockpitQueues', () => {
    it('should derive real WorkItems and OperationalThreads from CockpitRawData', () => {
        const items = getCockpitQueues(mockRawData);

        expect(items.length).toBeGreaterThan(0);

        // Incident exception item
        const incidentItem = items.find((i) => i.id.startsWith('queue-exception-incident-'));
        expect(incidentItem).toBeDefined();
        expect(incidentItem?.priority).toBe('critical');
        expect(incidentItem?.category).toBe('exception');

        // Conversation item
        const conversationItem = items.find((i) => i.id.startsWith('queue-conversation-'));
        expect(conversationItem).toBeDefined();
        expect(conversationItem?.priority).toBe('critical'); // 50 pending minutes >= 45
        expect(conversationItem?.operationalThread.activeStage).toBe('atendimento');
        expect(conversationItem?.availableActions.length).toBeGreaterThan(0);

        // Order item
        const orderItem = items.find((i) => i.id.startsWith('queue-order-'));
        expect(orderItem).toBeDefined();
        expect(orderItem?.priority).toBe('warning'); // > 60m updated
        expect(orderItem?.operationalThread.activeStage).toBe('pedido');

        // Freight item
        const freightItem = items.find((i) => i.id.startsWith('queue-freight-'));
        expect(freightItem).toBeDefined();
        expect(freightItem?.operationalThread.activeStage).toBe('logistica');
    });
});
