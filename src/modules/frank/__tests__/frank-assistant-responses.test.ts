import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleIncomingMessage } from '../whatsapp-orchestrator';
import { twilioProvider } from '@/providers/twilio.provider';
import * as getCustomerContextTool from '../tools/read-only/getCustomerContext.tool';
import * as getOrderStatusTool from '../tools/read-only/getOrderStatus.tool';
import * as getRecentOrdersTool from '../tools/read-only/getRecentOrders.tool';
import * as getShipmentStatusTool from '../tools/read-only/getShipmentStatus.tool';
import * as resolver from '../context-resolver';
import * as toolGuard from '../tools/tool-guard';
import * as repo from '../session.repository';
import * as pubsub from '@/lib/events/operational-event-bus';

// Mock everything that touches I/O
vi.mock('@/providers/twilio.provider', () => ({
    twilioProvider: {
        sendMessage: vi.fn().mockResolvedValue(true),
        generateTwiMLResponse: vi.fn(),
        parseIncomingMessage: vi.fn()
    }
}));

vi.mock('@/infra/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    }
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn().mockResolvedValue(true)
}));

vi.mock('../session.repository', () => ({
    updateSessionState: vi.fn().mockResolvedValue(true)
}));

vi.mock('../tools/tool-guard', () => ({
    isFrankAssistantMode: vi.fn().mockReturnValue(true)
}));

vi.mock('../context-resolver', () => ({
    resolveConversationContext: vi.fn().mockResolvedValue({
        tenantId: 't1',
        customer: { phoneHash: 'hash', isReturning: true },
        sessionState: null,
        lastQuotes: [],
    })
}));

vi.mock('../tools/read-only/getCustomerContext.tool', () => ({
    getCustomerContextTool: vi.fn()
}));

vi.mock('../tools/read-only/getOrderStatus.tool', () => ({
    getOrderStatusTool: vi.fn()
}));

vi.mock('../tools/read-only/getRecentOrders.tool', () => ({
    getRecentOrdersTool: vi.fn()
}));

vi.mock('../tools/read-only/getShipmentStatus.tool', () => ({
    getShipmentStatusTool: vi.fn()
}));

vi.mock('../tools/read-only/shared', () => ({
    resolveFrankCustomerReference: vi.fn().mockResolvedValue({ customerId: 'cust_1' })
}));

vi.mock('../playbooks/playbook.service', () => ({
    resolvePlaybook: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/config/app.config', () => ({
    appConfig: { env: 'test', logLevel: 'info', session: { ttlHours: 6, ttlMs: 21600000 }, freight: {}, frank: { runtimeMode: 'AUTONOMOUS', runtimeEnabled: false } },
    isFrankRuntimeEnabled: vi.fn().mockReturnValue(false),
    isFrankSupervisedOnly: vi.fn().mockReturnValue(false),
}));

vi.mock('../knowledge/knowledge.service', () => ({
    resolveKnowledge: vi.fn().mockResolvedValue(null),
}));

vi.mock('../memory/memory.service', () => ({
    recordInboundMessage: vi.fn().mockResolvedValue(undefined),
    recordOutboundMessage: vi.fn().mockResolvedValue(undefined),
    loadConversationContext: vi.fn().mockResolvedValue({ messages: [] }),
}));

vi.mock('../suggestions/suggestion.service', () => ({
    generateSuggestion: vi.fn().mockResolvedValue('suggestion-id'),
}));

describe('Frank Assistant Response Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(getCustomerContextTool, 'getCustomerContextTool').mockResolvedValue(null);
        vi.spyOn(getOrderStatusTool, 'getOrderStatusTool').mockResolvedValue(null);
        vi.spyOn(getRecentOrdersTool, 'getRecentOrdersTool').mockResolvedValue([]);
        vi.spyOn(getShipmentStatusTool, 'getShipmentStatusTool').mockResolvedValue(null);
    });

    it('should reply strictly within Assistant constraints for generic requests', async () => {
        const result = await handleIncomingMessage('t1', 'calcular frete entrega prazo cep', '+5511999999999');
        
        expect(result.intent).toBe('FRETE');
        expect(result.reply).toContain('Neste momento eu só consulto dados');
        expect(twilioProvider.sendMessage).not.toHaveBeenCalled();
    });

    it('should format short follow-up (e agora) accurately via entity extraction', async () => {
        // Setup session anchor as ORDER_STATUS to test 'e agora?' -> SHIPMENT_STATUS transition
        vi.spyOn(resolver, 'resolveConversationContext').mockResolvedValueOnce({
            tenantId: 't1',
            customer: { phoneHash: 'hash', isReturning: true },
            sessionState: {
                currentIntent: 'ORDER_STATUS',
                lastOrderId: 'ord_123'
            },
            lastQuotes: [],
        } as any);

        vi.spyOn(getOrderStatusTool, 'getOrderStatusTool').mockResolvedValue({
            order: { id: 'ord_123', customerId: 'cust_1', createdAt: new Date() },
            currentStatus: 'approved',
            linkedShipment: { shipmentId: 'shp_123', carrier: 'Jadlog', status: 'delivered' }
        } as any);

        vi.spyOn(getShipmentStatusTool, 'getShipmentStatusTool').mockResolvedValue({
            shipment: { id: 'shp_123', orderId: 'ord_123', status: 'delivered', createdAt: new Date() },
            carrier: { name: 'Jadlog', service: 'Standard' },
            deliveryStatus: 'delivered',
            trackingToken: 'JD123',
            statusHistory: [],
            lastLocationEvent: null
        } as any);

        const result = await handleIncomingMessage('t1', 'e agora?', '+5511999999999');
        
        // Assert intent transition
        expect(result.intent).toBe('SHIPMENT_STATUS');
        
        // Assert correct format string blocks
        expect(result.reply).toContain('shp_123');
        expect(result.reply).toContain('delivered');
        expect(result.reply).toContain('Jadlog');
        expect(result.reply).toContain('JD123');
        expect(result.reply).toContain('Posso também');
        expect(result.reply).toContain('consultar seu último pedido'); // Validates menu builder execution
    });

    it('should send a two-step wait message when doing a heavy chained order lookup', async () => {
        vi.spyOn(resolver, 'resolveConversationContext').mockResolvedValueOnce({
            tenantId: 't1',
            customer: { phoneHash: 'hash', isReturning: true },
            sessionState: null,
            lastQuotes: [],
        } as any);

        // Mock recent orders returning an order
        vi.spyOn(getRecentOrdersTool, 'getRecentOrdersTool').mockResolvedValue([{
            orderId: 'heavy_ord',
            linkedShipment: null,
            currentStatus: 'approved',
            createdAt: new Date()
        }]);

        // Mock order status success
        vi.spyOn(getOrderStatusTool, 'getOrderStatusTool').mockResolvedValue({
            order: { id: 'heavy_ord', customerId: 'cust_1', createdAt: new Date() },
            currentStatus: 'approved',
            linkedShipment: null,
            statusHistory: []
        } as any);

        const result = await handleIncomingMessage('t1', 'meu pedido da encomenda de compra', '+5511999999999');

        expect(result.intent).toBe('PEDIDO');
        // Validate two-step dispatching
        expect(twilioProvider.sendMessage).toHaveBeenCalledWith('t1', {
            to: '+5511999999999',
            body: 'Estou verificando seu pedido para te responder com precisão.'
        });

        // Validates final outcome correctness
        expect(result.reply).toContain('heavy_ord');
        expect(result.reply).toContain('approved');
        expect(result.reply).toContain('Posso também');
        expect(result.reply).toContain('verificar uma nova cotação');
    });
});
