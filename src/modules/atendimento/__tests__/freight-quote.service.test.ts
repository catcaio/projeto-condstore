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
});
