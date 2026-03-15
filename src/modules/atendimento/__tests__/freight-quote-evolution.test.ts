import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FreightQuoteService } from '../freight-quote.service';
import * as dbInfra from '@/infra/db';
import { freightService } from '@/modules/freight/freight.service';
import { domineIntakeService } from '@/domine/domine-intake.service';

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/modules/freight/freight.service', () => ({
    freightService: {
        calculateFreight: vi.fn().mockResolvedValue({
            options: [{ carrier: 'Correios', service: 'SEDEX', price: 25.50 }]
        }),
    }
}));

vi.mock('@/domine/domine-intake.service', () => ({
    domineIntakeService: {
        publish: vi.fn().mockResolvedValue(undefined),
    }
}));

describe('Commercial Quote Evolution - Freight Quote Service', () => {
    let service: FreightQuoteService;

    const mockDbUpdate = vi.fn().mockReturnThis();
    const mockDbWhere = vi.fn().mockReturnThis();
    const mockDbSelect = vi.fn().mockReturnThis();
    const mockDbFrom = vi.fn().mockReturnThis();

    beforeEach(() => {
        vi.clearAllMocks();
        service = new FreightQuoteService();
    });

    it('should freeze prices into Subtotal and correctly calculate initial total amount with discount omitted', async () => {
        const mockDb = {
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockResolvedValue([{ insertId: 'quote-1' }])
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await service.simulateQuoteFromConversation({
            tenantId: 't1', conversationId: 'c1', operatorId: 'op1', cep: '000000', weight: 1, quantity: 1,
            items: [
                { name: 'Item 1', unitPrice: 100, quantity: 2 }
            ]
        });

        expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
            subtotal: '200',
            freightAmount: '25.5',
            totalAmount: '225.5',
            status: 'DRAFT'
        }));
    });

    it('should calculate discount and revision count when revising a quote', async () => {
        const mockQuoteRow = {
            id: 'quote-2',
            tenantId: 't1',
            status: 'DRAFT',
            discountAmount: '0',
            freightAmount: '25.5',
            revisionCount: 0,
            items: [{ name: 'Item 1', unitPrice: 100, quantity: 2 }]
        };

        mockDbSelect.mockImplementation(() => ({
            from: mockDbFrom.mockImplementation(() => ({
                where: vi.fn().mockImplementation(() => ({
                    limit: vi.fn().mockResolvedValue([mockQuoteRow])
                }))
            }))
        }));

        const mockDb = {
            select: mockDbSelect,
            update: vi.fn().mockReturnThis(),
            set: mockDbUpdate.mockReturnThis(),
            where: mockDbWhere
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);
        
        // Mock getQuoteById so revise works without crashing db mock chaining
        vi.spyOn(service, 'getQuoteById').mockResolvedValue(mockQuoteRow as any);

        await service.reviseQuote('t1', 'quote-2', {
            discountAmount: 25.5,
        });

        // 200 + 25.5 freight = 225.5 total
        // with 25.5 discount => 200 total  
        
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
            subtotal: '200',
            discountAmount: '25.5',
            totalAmount: '200',
            revisionCount: 1,
            status: 'DRAFT'
        }));
    });

    it('should reject revision if discount is negative', async () => {
        const mockQuoteRow = {
            id: 'quote-2',
            tenantId: 't1',
            status: 'DRAFT',
            discountAmount: '0',
            freightAmount: '20',
            items: [{ name: 'Item A', unitPrice: 100, quantity: 1 }]
        };

        vi.spyOn(service, 'getQuoteById').mockResolvedValue(mockQuoteRow as any);

        await expect(service.reviseQuote('t1', 'quote-2', { discountAmount: -10 }))
            .rejects.toThrow('Discount cannot be negative');
    });

    it('should reject revision if discount exceeds total possible value', async () => {
        const mockQuoteRow = {
            id: 'quote-2',
            tenantId: 't1',
            status: 'DRAFT',
            discountAmount: '0',
            freightAmount: '20',
            items: [{ name: 'Item A', unitPrice: 100, quantity: 1 }] 
        }; // Subtotal 100 + Freight 20 = 120

        vi.spyOn(service, 'getQuoteById').mockResolvedValue(mockQuoteRow as any);

        await expect(service.reviseQuote('t1', 'quote-2', { discountAmount: 121 }))
            .rejects.toThrow('Discount cannot exceed total quote value');
    });

    it('should transition quote status properly on send and accept', async () => {
        const mockQuoteRow = { id: 'quote-3', status: 'DRAFT' };
        vi.spyOn(service, 'getQuoteById').mockResolvedValue(mockQuoteRow as any);
        const mockDb = { update: vi.fn().mockReturnThis(), set: mockDbUpdate, where: mockDbWhere };
        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await service.sendQuote('t1', 'quote-3');
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'SENT' }));

        await service.acceptQuote('t1', 'quote-3');
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACCEPTED' }));
    });
});
