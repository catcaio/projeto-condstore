import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockResolveIntent,
    mockResolveContextualIntent,
    mockResolveConversationContext,
    mockGetOrderStatusTool,
    mockGetShipmentStatusTool,
    mockGetRecentQuotesTool,
    mockGetRecentOrdersTool,
    mockGetCustomerContextTool,
    mockResolveFrankCustomerReference,
    mockUpdateSessionState,
    mockLoggerInfo,
    mockLoggerWarn,
    mockLoggerError,
    mockPublishOperationalEvent,
    mockResolvePlaybook,
} = vi.hoisted(() => ({
    mockResolveIntent: vi.fn(),
    mockResolveContextualIntent: vi.fn(),
    mockResolveConversationContext: vi.fn(),
    mockGetOrderStatusTool: vi.fn(),
    mockGetShipmentStatusTool: vi.fn(),
    mockGetRecentQuotesTool: vi.fn(),
    mockGetRecentOrdersTool: vi.fn(),
    mockGetCustomerContextTool: vi.fn(),
    mockResolveFrankCustomerReference: vi.fn(),
    mockUpdateSessionState: vi.fn().mockResolvedValue(undefined),
    mockLoggerInfo: vi.fn(),
    mockLoggerWarn: vi.fn(),
    mockLoggerError: vi.fn(),
    mockPublishOperationalEvent: vi.fn().mockResolvedValue(undefined),
    mockResolvePlaybook: vi.fn().mockResolvedValue(null),
}));

vi.mock('./intent-resolver', () => ({
    resolveIntent: mockResolveIntent,
    resolveContextualIntent: mockResolveContextualIntent,
}));

vi.mock('./context-resolver', () => ({
    resolveConversationContext: mockResolveConversationContext,
}));

vi.mock('./playbooks/playbook.service', () => ({
    resolvePlaybook: mockResolvePlaybook,
}));

vi.mock('./knowledge/knowledge.service', () => ({
    resolveKnowledge: vi.fn().mockResolvedValue(null),
}));

vi.mock('./memory/memory.service', () => ({
    recordInboundMessage: vi.fn().mockResolvedValue(undefined),
    recordOutboundMessage: vi.fn().mockResolvedValue(undefined),
    loadConversationContext: vi.fn().mockResolvedValue({ messages: [] }),
}));

vi.mock('./suggestions/suggestion.service', () => ({
    generateSuggestion: vi.fn().mockResolvedValue('suggestion-id'),
}));

vi.mock('./cep-extractor', () => ({
    extractCep: vi.fn().mockReturnValue(null),
    extractCepRaw: vi.fn().mockReturnValue(null),
}));

vi.mock('./product-resolver', () => ({
    resolveProductFromUrl: vi.fn().mockReturnValue(null),
}));

vi.mock('./tools/create-order-from-quote.tool', () => ({
    createOrderFromQuoteTool: vi.fn(),
}));

vi.mock('./tools/tool-guard', () => ({
    isFrankAssistantMode: vi.fn().mockReturnValue(true),
}));

vi.mock('./tools/read-only/getOrderStatus.tool', () => ({
    getOrderStatusTool: mockGetOrderStatusTool,
}));

vi.mock('./tools/read-only/getShipmentStatus.tool', () => ({
    getShipmentStatusTool: mockGetShipmentStatusTool,
}));

vi.mock('./tools/read-only/getRecentQuotes.tool', () => ({
    getRecentQuotesTool: mockGetRecentQuotesTool,
}));

vi.mock('./tools/read-only/getRecentOrders.tool', () => ({
    getRecentOrdersTool: mockGetRecentOrdersTool,
}));

vi.mock('./tools/read-only/getCustomerContext.tool', () => ({
    getCustomerContextTool: mockGetCustomerContextTool,
}));

vi.mock('./tools/read-only/shared', () => ({
    resolveFrankCustomerReference: mockResolveFrankCustomerReference,
}));

vi.mock('./session.repository', () => ({
    updateSessionState: mockUpdateSessionState,
}));

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/modules/freight/quoting/packing-resolver', () => ({
    resolvePackingDimensions: vi.fn(),
}));

vi.mock('@/modules/freight/quoting/table-driven-adapter', () => ({
    TableDrivenAdapter: vi.fn(),
}));

vi.mock('@/core/freight/operational-settings', () => ({
    loadOperationalSettings: vi.fn(),
}));

vi.mock('@/modules/freight/freight-audit', () => ({
    logFreightSimulation: vi.fn(),
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: mockPublishOperationalEvent,
}));

vi.mock('@/config/app.config', () => ({
    appConfig: { env: 'test', logLevel: 'info', session: { ttlHours: 6, ttlMs: 21600000 }, freight: {}, frank: { runtimeMode: 'AUTONOMOUS', runtimeEnabled: false } },
    isFrankRuntimeEnabled: vi.fn().mockReturnValue(false),
    isFrankSupervisedOnly: vi.fn().mockReturnValue(false),
}));

vi.mock('@/infra/logger', () => ({
    logger: {
        info: mockLoggerInfo,
        warn: mockLoggerWarn,
        error: mockLoggerError,
    },
}));

import { handleIncomingMessage } from './whatsapp-orchestrator';

const BASE_CONTEXT = {
    customer: {
        phone: 'whatsapp:+5511999999999',
        phoneHash: 'hash-123',
        isReturning: true,
    },
    lastMessages: [],
    lastQuotes: [],
    sessionState: null,
};

describe('handleIncomingMessage assistant mode', () => {
    beforeEach(() => {
        mockResolveConversationContext.mockResolvedValue(BASE_CONTEXT);
        // By default, contextual resolution delegates to the mock intent
        mockResolveContextualIntent.mockImplementation((_msg: string, _anchors: unknown) => {
            return mockResolveIntent();
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        mockResolveConversationContext.mockResolvedValue(BASE_CONTEXT);
    });

    it('returns order status in standardized assistant format', async () => {
        const orderId = '11111111-1111-1111-1111-111111111111';

        mockResolveIntent.mockReturnValue({ intent: 'ORDER_STATUS', confidence: 0.9 });
        mockGetOrderStatusTool.mockResolvedValue({
            order: {
                id: orderId,
                customerId: 'customer-1',
                createdAt: new Date('2026-03-01T10:00:00Z'),
            },
            currentStatus: 'separacao',
            statusHistory: [
                {
                    previousStatus: 'recebido',
                    status: 'separacao',
                    reason: null,
                    changedBy: null,
                    createdAt: new Date('2026-03-02T12:00:00Z'),
                },
            ],
            linkedShipment: {
                shipmentId: 'ship-1',
                carrier: 'Braspress',
                service: 'Rodoviario',
                trackingCode: 'TRACK123',
                status: 'em_transito',
                updatedAt: new Date('2026-03-02T12:00:00Z'),
            },
        });

        const result = await handleIncomingMessage(
            'tenant-1',
            `qual o status do pedido ${orderId}`,
            'whatsapp:+5511999999999',
        );

        expect(result.reply).toContain(`Seu pedido ${orderId} está com status: separacao.`);
        expect(result.reply).toContain('Criado em:');
        expect(result.reply).toContain('Envio: ship-1');
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            'frank_assist_response',
            expect.objectContaining({
                tenantId: 'tenant-1',
                toolUsed: 'get_order_status',
                outcome: 'success',
                orderId,
            }),
        );
    });

    it('returns shipment status in standardized assistant format', async () => {
        const shipmentId = '22222222-2222-2222-2222-222222222222';

        mockResolveIntent.mockReturnValue({ intent: 'SHIPMENT_STATUS', confidence: 0.8 });
        mockGetShipmentStatusTool.mockResolvedValue({
            shipment: { id: shipmentId },
            carrier: { name: 'Jadlog', service: 'Expresso' },
            trackingToken: 'TRK-001',
            deliveryStatus: 'em_transito',
            lastLocationEvent: {
                lat: '-23.550520',
                lng: '-46.633308',
                accuracy: 10,
                recordedAt: new Date('2026-03-03T08:00:00Z'),
            },
        });

        const result = await handleIncomingMessage(
            'tenant-1',
            `tem rastreio do envio ${shipmentId}?`,
            'whatsapp:+5511999999999',
        );

        expect(result.reply).toContain(`Seu envio ${shipmentId} está com status: em transito.`);
        expect(result.reply).toContain('Rastreio: TRK-001');
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            'frank_assist_response',
            expect.objectContaining({
                tenantId: 'tenant-1',
                toolUsed: 'get_shipment_status',
                outcome: 'success',
                shipmentId,
            }),
        );
    });

    it('returns recent quotes in standardized assistant format', async () => {
        mockResolveIntent.mockReturnValue({ intent: 'RECENT_QUOTES', confidence: 0.85 });
        mockResolveFrankCustomerReference.mockResolvedValue({
            customerId: 'customer-1',
            organizationId: 'org-1',
        });
        mockGetRecentQuotesTool.mockResolvedValue([
            {
                simulationId: 'sim-1',
                routeSummary: 'Destino 01310-100',
                carrierSummary: 'Azul Cargo',
                quotedAt: new Date('2026-03-04T09:00:00Z'),
                currentQuoteState: 'SIMULATED',
            },
        ]);

        const result = await handleIncomingMessage(
            'tenant-1',
            'qual foi minha última cotação?',
            'whatsapp:+5511999999999',
        );

        expect(result.reply).toContain('Encontrei 1 cotação(ões) recente(s).');
        expect(result.reply).toContain('sim-1 • Destino 01310-100 • Azul Cargo');
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            'frank_assist_response',
            expect.objectContaining({
                tenantId: 'tenant-1',
                toolUsed: 'get_recent_quotes',
                outcome: 'success',
                simulationId: 'sim-1',
            }),
        );
    });

    it('falls back safely when customer context is missing', async () => {
        mockResolveIntent.mockReturnValue({ intent: 'RECENT_ORDERS', confidence: 0.8 });
        mockResolveFrankCustomerReference.mockResolvedValue(null);

        const result = await handleIncomingMessage(
            'tenant-1',
            'qual meu último pedido?',
            'whatsapp:+5511999999999',
        );

        expect(result.reply).toContain('Não consegui localizar o cliente desta conversa com segurança.');
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'frank_assist_handoff',
            expect.objectContaining({
                tenantId: 'tenant-1',
                reason: 'customer_context_missing',
                intent: 'RECENT_ORDERS',
            }),
        );
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            'frank_assist_response',
            expect.objectContaining({
                outcome: 'fallback',
                missingContextReason: 'customer_context_missing',
            }),
        );
    });

    it('falls back safely on low confidence without calling tools', async () => {
        mockResolveIntent.mockReturnValue({ intent: 'ORDER_STATUS', confidence: 0.1 });

        const result = await handleIncomingMessage(
            'tenant-1',
            'pedido',
            'whatsapp:+5511999999999',
        );

        expect(result.reply).toContain('Não consegui classificar essa solicitação com segurança.');
        expect(mockGetOrderStatusTool).not.toHaveBeenCalled();
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'frank_assist_handoff',
            expect.objectContaining({
                tenantId: 'tenant-1',
                reason: 'low_confidence',
                intent: 'ORDER_STATUS',
            }),
        );
    });

    it('persists session anchors after successful order status resolution', async () => {
        const orderId = '33333333-3333-3333-3333-333333333333';

        mockResolveIntent.mockReturnValue({ intent: 'ORDER_STATUS', confidence: 0.9 });
        mockResolveConversationContext.mockResolvedValue({
            ...BASE_CONTEXT,
            sessionState: {
                id: 'sess-1',
                tenantId: 'tenant-1',
                sessionId: 'hash-123',
                customerId: null,
                organizationId: null,
                currentIntent: null,
                currentStep: null,
                lastSimulationId: null,
                lastOrderId: null,
                lastReferencedShipmentId: null,
                lastReferencedQuoteId: null,
                lastReferencedCustomerId: null,
                lastToolUsed: null,
                contextJson: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        mockGetOrderStatusTool.mockResolvedValue({
            order: { id: orderId, customerId: 'customer-1', createdAt: new Date() },
            currentStatus: 'separacao',
            statusHistory: [],
            linkedShipment: null,
        });

        await handleIncomingMessage('tenant-1', `status do pedido ${orderId}`, 'whatsapp:+5511999999999');

        // Verify anchors were persisted
        expect(mockUpdateSessionState).toHaveBeenCalledWith(
            'tenant-1',
            'hash-123',
            expect.objectContaining({
                currentIntent: 'ORDER_STATUS',
                lastOrderId: orderId,
                lastToolUsed: 'get_order_status',
            }),
        );
    });

    it('uses contextual intent resolution for follow-up messages in assistant mode', async () => {
        // Simulate a follow-up: resolveContextualIntent returns SHIPMENT_STATUS
        // because previous intent was ORDER_STATUS and order anchor exists
        mockResolveContextualIntent.mockReturnValue({ intent: 'SHIPMENT_STATUS', confidence: 0.70 });

        const sessionWithAnchors = {
            ...BASE_CONTEXT,
            sessionState: {
                id: 'sess-1',
                tenantId: 'tenant-1',
                sessionId: 'hash-123',
                customerId: null,
                organizationId: null,
                currentIntent: 'ORDER_STATUS',
                currentStep: null,
                lastSimulationId: null,
                lastOrderId: 'order-prev',
                lastReferencedShipmentId: null,
                lastReferencedQuoteId: null,
                lastReferencedCustomerId: null,
                lastToolUsed: 'get_order_status',
                contextJson: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        };
        mockResolveConversationContext.mockResolvedValue(sessionWithAnchors);

        // The orchestrator will try to find the shipment via the order anchor
        mockGetOrderStatusTool.mockResolvedValue({
            order: { id: 'order-prev', customerId: 'customer-1', createdAt: new Date() },
            currentStatus: 'expedido',
            statusHistory: [],
            linkedShipment: {
                shipmentId: 'ship-1',
                carrier: 'Jadlog',
                service: 'Expresso',
                trackingCode: 'TRK-999',
                status: 'em_transito',
                updatedAt: new Date(),
            },
        });
        mockGetShipmentStatusTool.mockResolvedValue({
            shipment: { id: 'ship-1' },
            carrier: { name: 'Jadlog', service: 'Expresso' },
            trackingToken: 'TRK-999',
            deliveryStatus: 'em_transito',
            lastLocationEvent: null,
        });

        const result = await handleIncomingMessage(
            'tenant-1',
            'e o envio?',
            'whatsapp:+5511999999999',
        );

        expect(result.intent).toBe('SHIPMENT_STATUS');
        expect(result.reply).toContain('Seu envio ship-1');
        expect(mockResolveContextualIntent).toHaveBeenCalled();
    });

    it('falls back safely when follow-up phrase has no anchor context', async () => {
        // Follow-up phrase but no session state (no anchors)
        mockResolveContextualIntent.mockReturnValue({ intent: 'OUTRO', confidence: 0.1 });

        const result = await handleIncomingMessage(
            'tenant-1',
            'e agora?',
            'whatsapp:+5511999999999',
        );

        expect(result.reply).toContain('Não consegui classificar essa solicitação com segurança.');
        expect(mockGetOrderStatusTool).not.toHaveBeenCalled();
        expect(mockGetShipmentStatusTool).not.toHaveBeenCalled();
    });
});
