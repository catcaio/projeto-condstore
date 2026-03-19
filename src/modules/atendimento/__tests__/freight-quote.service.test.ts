import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FreightQuoteService } from '../freight-quote.service';
import * as dbInfra from '@/infra/db';
import { freightService } from '@/modules/freight/freight.service';
import { domineIntakeService } from '@/domine/domine-intake.service';
import { conversationService } from '../conversation.service';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { crmService } from '@/modules/crm/server';

vi.mock('../conversation.service', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../conversation.service')>();
    return {
        ...actual,
        conversationService: {
            ...actual.conversationService,
            changeConversationStage: vi.fn(),
        }
    };
});

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn(),
}));

vi.mock('@/modules/crm/server', () => ({
    crmService: {
        syncSimulationToQuote: vi.fn().mockResolvedValue({ opportunityId: 'opp-1' }),
        scheduleQuoteFollowUp: vi.fn(),
    }
}));

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/modules/freight/freight.service', () => ({
    freightService: {
        calculateFreight: vi.fn(),
    }
}));

vi.mock('@/domine/domine-intake.service', () => ({
    domineIntakeService: {
        publish: vi.fn().mockResolvedValue(undefined),
    }
}));

describe('Freight Quote Service', () => {
    let service: FreightQuoteService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new FreightQuoteService();
    });

    it('should create a quote mapped with multiple real commercial product items', async () => {
        const mockFreightRes = {
            options: [
                { carrier: 'Correios', service: 'SEDEX', price: 25.50 }
            ]
        };

        vi.mocked(freightService.calculateFreight).mockResolvedValue(mockFreightRes as any);

        const mockDb = {
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockResolvedValue([{ insertId: 'quote-1' }])
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        const input = {
            tenantId: 't1',
            conversationId: 'c1',
            operatorId: 'o1',
            cep: '12345678',
            weight: 1,
            quantity: 1,
            items: [
                { productId: 'p1', name: 'Product 1', unitPrice: 100, quantity: 2 },
                { productId: 'p2', name: 'Product 2', unitPrice: 50, quantity: 1 }
            ]
        };

        const result = await service.simulateQuoteFromConversation(input);

        // Subtotal should be (2 * 100) + (1 * 50) = 250
        // Total amount should be 250 + 25.50 freight = 275.50

        expect(mockDb.insert).toHaveBeenCalled();
        expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
            subtotal: '250',
            freightAmount: '25.5',
            totalAmount: '275.5',
            bestPrice: '25.5',
            items: input.items,
        }));
    });

    it('should update conversation to QUOTED and emit quoted event', async () => {
        vi.mocked(freightService.calculateFreight).mockResolvedValue({ options: [{ carrier: 'Test', price: 10 }] } as any);
        const mockDb = {
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockResolvedValue(true),
        };
        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await service.simulateQuoteFromConversation({
            tenantId: 't1', conversationId: 'c1', customerId: 'cust1', operatorId: 'o1',
            cep: '12345678', weight: 1, quantity: 1, items: [{ name: 'Test', unitPrice: 10, quantity: 1 }]
        });

        expect(conversationService.changeConversationStage).toHaveBeenCalledWith(
            't1', 'c1', 'QUOTED', 'cust1'
        );

        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'quoted',
            eventDomain: 'CONVERSION',
            payload: expect.objectContaining({ conversationId: 'c1' })
        }));
    });

    it('should sync CRM Quotes/Opportunities and emit quote_sent event upon send Quote', async () => {
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn()
                .mockResolvedValueOnce([{ id: 'quote-1', conversationId: 'conv-1', customerId: 'cust-1' }]) // getQuoteById
                .mockResolvedValueOnce([{ opportunityId: 'opp-1' }]), // CRM quote fetch
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
        };
        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await service.sendQuote('tenant-1', 'quote-1');

        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'SENT' })); // simulations
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' })); // crmQuotes
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ stage: 'proposal_sent' })); // crmOpportunities

        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'quote_sent',
            eventDomain: 'CONVERSION',
        }));
    });

    it('should sync CRM Quotes/Opportunities and emit quote_accepted event upon accept Quote', async () => {
         const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn()
                .mockResolvedValueOnce([{ id: 'quote-1', conversationId: 'conv-1', customerId: 'cust-1', status: 'SENT' }]) 
                .mockResolvedValueOnce([{ opportunityId: 'opp-1' }]), 
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
        };
        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await service.acceptQuote('tenant-1', 'quote-1');

        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACCEPTED' })); // simulations
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' })); // crmQuotes
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ stage: 'awaiting_response' })); // crmOpportunities

        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'quote_accepted',
            eventDomain: 'CONVERSION',
        }));
    });
});
