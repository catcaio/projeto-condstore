import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderService } from '../order.service';
import * as dbInfra from '@/infra/db';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { conversationService } from '../conversation.service';
import { redisClient } from '@/infra/redis.client';

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn(),
}));

vi.mock('@/infra/redis.client', () => ({
    redisClient: {
        setNx: vi.fn(),
        del: vi.fn(),
        eval: vi.fn(),
    }
}));

vi.mock('../conversation.service', () => ({
    conversationService: {
        changeConversationStage: vi.fn().mockResolvedValue(undefined),
    }
}));

vi.mock('../message.service', () => ({
    messageService: {
        processSystemEvent: vi.fn().mockResolvedValue(undefined),
    }
}));

describe('Order Service Implementation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(redisClient.setNx).mockResolvedValue(true);
        vi.mocked(redisClient.del).mockResolvedValue(undefined);
        vi.mocked(redisClient.eval).mockResolvedValue(undefined);
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
                .mockResolvedValueOnce([]) // idempotency guard
                .mockResolvedValueOnce([{ id: 'mocked-id', status: 'CREATED' }]) // fetch saved order phase
                .mockResolvedValueOnce([{ opportunityId: 'opp-123' }]), // fetch crm quote phase
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockResolvedValue([{ insertId: 'mocked-id' }]),
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
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

        // Assert CRM Opportunity and Quote got updated to won/converted
        expect(mockDb.update).toHaveBeenCalled();
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ stage: 'won', status: 'won' }));
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }));

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

    it('should return existing order if one is already created from the same quote (Idempotency)', async () => {
        const mockQuote = { id: 'quote-456' };
        const existingOrder = { id: 'order-already-exists' };

        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn()
                .mockResolvedValueOnce([mockQuote]) // found quote
                .mockResolvedValueOnce([existingOrder]) // idempotency hit
                .mockResolvedValueOnce([{ opportunityId: 'opp-123' }]), // fetch crm quote phase
            insert: vi.fn(),
            update: vi.fn()
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        const order = await orderService.createOrderFromQuote('tenant-1', 'conv-123', 'quote-456', 'operator-999');

        expect(order).toEqual(existingOrder);
        expect(mockDb.insert).not.toHaveBeenCalled();
        expect(mockDb.update).not.toHaveBeenCalled();
        expect(conversationService.changeConversationStage).not.toHaveBeenCalled();
        expect(redisClient.eval).toHaveBeenCalled();
    });

    describe('Concurrency and Lock mechanisms', () => {
        it('should throw Error if quote lock is currently held by another worker', async () => {
            vi.mocked(redisClient.setNx).mockResolvedValueOnce(false); // lock held
            
            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn()
                    .mockResolvedValueOnce([{ id: 'quote-456' }]) // quote exists
                    .mockResolvedValueOnce([]) // existing order NOT found during lock fallback
            };
            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            await expect(orderService.createOrderFromQuote('t1', 'c1', 'quote-456', 'op1'))
                .rejects.toThrow('A cotação está sendo processada no momento.');
            
            // Should NOT try to release lock because it didn't acquire it
            expect(redisClient.eval).not.toHaveBeenCalled();
        });

        it('should return existing order if quote lock is held but order was already created (Double click bypass)', async () => {
            vi.mocked(redisClient.setNx).mockResolvedValueOnce(false); // lock held

            const existingOrder = { id: 'order-already' };
            
            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn()
                    .mockResolvedValueOnce([{ id: 'quote-456' }]) // quote exists
                    .mockResolvedValueOnce([existingOrder]) // existing order IS found
            };
            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            const order = await orderService.createOrderFromQuote('t1', 'c1', 'quote-456', 'op1');
            expect(order).toEqual(existingOrder);
            
            // Should NOT try to release lock because it didn't acquire it
            expect(redisClient.eval).not.toHaveBeenCalled();
        });

        it('should handle ER_DUP_ENTRY fallback by returning the newly created concurrent order', async () => {
            vi.mocked(redisClient.setNx).mockResolvedValueOnce(true);

            const mockQuote = { id: 'quote-123' };
            const fallbackOrder = { id: 'order-concurrent' };

            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn()
                    .mockResolvedValueOnce([mockQuote]) // quote
                    .mockResolvedValueOnce([]) // idempotency guard - none exists
                    .mockResolvedValueOnce([fallbackOrder]), // fallback after duplicate entry
                insert: vi.fn().mockReturnThis(),
                values: vi.fn().mockRejectedValueOnce({ code: 'ER_DUP_ENTRY', message: 'Duplicate entry' }), // simulate race condition DB constraint
                update: vi.fn().mockReturnThis(),
                set: vi.fn().mockReturnThis(),
            };

            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            const order = await orderService.createOrderFromQuote('t1', 'c1', 'quote-123', 'op1');
            
            expect(order).toEqual(fallbackOrder);
            expect(mockDb.update).not.toHaveBeenCalled(); // side-effect should be bypassed
            expect(conversationService.changeConversationStage).not.toHaveBeenCalled(); // side-effect should be bypassed
            expect(redisClient.eval).toHaveBeenCalled(); // Ensure lock deletion evaluation runs
        });
    });

    describe('updateOrderStatus', () => {
        it('should emit order_confirmed event and SYSTEM timeline message when status is changed to CONFIRMED', async () => {
            const mockDb = {
                update: vi.fn().mockReturnThis(),
                set: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([{ id: 'order-1', customerId: 'cust-1', status: 'DRAFT', conversationId: 'conv-1' }])
            };

            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            await orderService.updateOrderStatus('tenant-1', 'order-1', 'CONFIRMED');

            expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'order_confirmed',
                payload: { orderId: 'order-1', status: 'CONFIRMED' }
            }));

            const { messageService } = await import('../message.service');
            expect(messageService.processSystemEvent).toHaveBeenCalledWith(
                'tenant-1',
                'conv-1',
                expect.stringContaining('foi confirmado e enviado para separação'),
                expect.objectContaining({ event: 'order_confirmed' })
            );
        });

        it('should throw Error if trying to illegally regress order status processing backward', async () => {
            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([{ id: 'order-1', status: 'SHIPPED', conversationId: 'conv-1' }])
            };

            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);
            await expect(orderService.updateOrderStatus('tenant-1', 'order-1', 'PROCESSING')).rejects.toThrow('Cannot regress order status');
        });

        it('should throw Error if trying to change status of a DELIVERED order', async () => {
            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([{ id: 'order-1', status: 'DELIVERED', conversationId: 'conv-1' }])
            };

            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);
            await expect(orderService.updateOrderStatus('tenant-1', 'order-1', 'CANCELED')).rejects.toThrow('Cannot change status of a DELIVERED order');
        });
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

    it('should prevent conversion if quote status is EXPIRED, CANCELED, or LOST', async () => {
        const statuses = ['EXPIRED', 'CANCELED', 'LOST'];
        for (const status of statuses) {
            const mockQuote = { id: 'quote-1', status };
            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([mockQuote]), 
            };
            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            await expect(
                orderService.createOrderFromQuote('tenant-1', 'conv-1', 'quote-1', 'op-1')
            ).rejects.toThrow(`Cannot convert quote with status: ${status}`);
        }
    });

    it('should dynamically expire a quote and prevent conversion if expiresAt is in the past', async () => {
        const pastDate = new Date(Date.now() - 100000);
        const mockQuote = { id: 'quote-2', status: 'DRAFT', expiresAt: pastDate };
        
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([mockQuote]), 
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
        };
        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await expect(
            orderService.createOrderFromQuote('tenant-1', 'conv-1', 'quote-2', 'op-1')
        ).rejects.toThrow('Cannot convert an expired quote');
        
        expect(mockDb.set).toHaveBeenCalledWith({ status: 'EXPIRED' });
    });
});
