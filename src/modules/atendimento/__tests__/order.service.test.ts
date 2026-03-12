import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderService } from '../order.service';
import * as dbInfra from '@/infra/db';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { conversationService } from '../conversation.service';

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn(),
}));

vi.mock('../conversation.service', () => ({
    conversationService: {
        changeConversationStage: vi.fn().mockResolvedValue(undefined),
    }
}));

describe('Order Service Implementation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully create an order from a given quote and update conversation stage to WON', async () => {
        const mockQuote = {
            id: 'quote-456',
            tenantId: 'tenant-1',
            customerId: 'custom-123',
            organizationId: 'org-789',
            bestPrice: '150.00',
            bestCarrier: 'Correios',
            bestService: 'SEDEX',
        };

        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn()
                .mockResolvedValueOnce([mockQuote]) // fetch quote phase
                .mockResolvedValueOnce([{ id: 'mocked-id', status: 'CREATED' }]), // fetch saved order phase
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockResolvedValue([{ insertId: 'mocked-id' }]),
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        const order = await orderService.createOrderFromQuote('tenant-1', 'conv-123', 'quote-456', 'operator-999');

        expect(order).toBeDefined();
        
        // Assert we called the CRM pipeline update
        expect(conversationService.changeConversationStage).toHaveBeenCalledWith(
            'tenant-1',
            'conv-123',
            'WON',
            'custom-123'
        );

        // Assert we fired an event
        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            eventType: 'order_created',
            eventDomain: 'CONVERSION',
            payload: expect.objectContaining({
                quoteId: 'quote-456',
                conversationId: 'conv-123'
            })
        }));
    });

    it('should emit order_confirmed event when status is changed to CONFIRMED', async () => {
        const mockDb = {
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([{ id: 'order-1', customerId: 'cust-1' }])
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await orderService.updateOrderStatus('tenant-1', 'order-1', 'CONFIRMED');

        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'order_confirmed',
            payload: { orderId: 'order-1', status: 'CONFIRMED' }
        }));
    });

    it('should throw an error if the linked quote does not exist', async () => {
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([]), // no quotes returned
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await expect(
            orderService.createOrderFromQuote('tenant-1', 'conv-123', 'invalid-quote', 'operator-999')
        ).rejects.toThrow('Quote not found');
    });
});
