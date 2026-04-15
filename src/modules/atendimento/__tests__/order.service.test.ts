import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderService } from '../order.service';
import { LOCK_TTL } from '@/infra/redis-ttl';
import * as dbInfra from '@/infra/db';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { conversationService } from '../conversation.service';
import { redisClient } from '@/infra/redis.client';
import { shipmentService } from '@/modules/logistics/server';

vi.mock('@/infra/db', async () => {
    const actual = await vi.importActual<typeof import('@/infra/db')>('@/infra/db');
    return {
        ...actual,
        getDb: vi.fn(),
    };
});

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

vi.mock('@/modules/logistics/server', () => ({
    shipmentService: {
        createShipmentFromOrder: vi.fn().mockResolvedValue({ id: 'shipment-1' }),
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
            status: 'ACCEPTED',
            bestPrice: '150.00',
            bestCarrier: 'Correios',
            bestService: 'SEDEX',
        };

        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn()
                .mockResolvedValueOnce([{ planStatus: 'trialing' }]) // tenant billing gate
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

        // Assert lock was acquired with the canonical TTL
        expect(redisClient.setNx).toHaveBeenCalledWith(
            expect.stringMatching(/^lock:quote-to-order:/),
            expect.any(String),
            expect.any(Number)
        );
        expect(conversationService.changeConversationStage).toHaveBeenCalledWith(
            'tenant-1',
            'conv-123',
            'WON',
            'custom-123'
        );
        expect(mockDb.update).toHaveBeenCalled();
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ stage: 'won', status: 'won' }));
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }));
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
        const mockQuote = { id: 'quote-456', status: 'ACCEPTED' };
        const existingOrder = { id: 'order-already-exists' };

        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn()
                .mockResolvedValueOnce([{ planStatus: 'active' }]) // tenant billing gate
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
            vi.mocked(redisClient.setNx).mockResolvedValueOnce(false);
            
            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn()
                    .mockResolvedValueOnce([{ planStatus: 'active' }]) // tenant billing gate
                    .mockResolvedValueOnce([{ id: 'quote-456', status: 'ACCEPTED' }]) // quote exists
                    .mockResolvedValueOnce([]) // existing order NOT found during lock fallback
            };
            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            await expect(orderService.createOrderFromQuote('t1', 'c1', 'quote-456', 'op1'))
                .rejects.toThrow('A cotação está sendo processada no momento.');
            
            expect(redisClient.eval).not.toHaveBeenCalled();
        });

        it('should return existing order if quote lock is held but order was already created (Double click bypass)', async () => {
            vi.mocked(redisClient.setNx).mockResolvedValueOnce(false);

            const existingOrder = { id: 'order-already' };
            
            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn()
                    .mockResolvedValueOnce([{ planStatus: 'active' }]) // tenant billing gate
                    .mockResolvedValueOnce([{ id: 'quote-456', status: 'ACCEPTED' }]) // quote exists
                    .mockResolvedValueOnce([existingOrder]) // existing order IS found
            };
            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            const order = await orderService.createOrderFromQuote('t1', 'c1', 'quote-456', 'op1');
            expect(order).toEqual(existingOrder);
            expect(redisClient.eval).not.toHaveBeenCalled();
        });

        it('should handle ER_DUP_ENTRY fallback by returning the newly created concurrent order', async () => {
            vi.mocked(redisClient.setNx).mockResolvedValueOnce(true);

            const mockQuote = { id: 'quote-123', status: 'ACCEPTED' };
            const fallbackOrder = { id: 'order-concurrent' };

            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn()
                    .mockResolvedValueOnce([{ planStatus: 'active' }]) // tenant billing gate
                    .mockResolvedValueOnce([mockQuote]) // quote
                    .mockResolvedValueOnce([]) // idempotency guard - none exists
                    .mockResolvedValueOnce([fallbackOrder]), // fallback after duplicate entry
                insert: vi.fn().mockReturnThis(),
                values: vi.fn().mockRejectedValueOnce({ code: 'ER_DUP_ENTRY', message: 'Duplicate entry' }),
                update: vi.fn().mockReturnThis(),
                set: vi.fn().mockReturnThis(),
            };

            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            const order = await orderService.createOrderFromQuote('t1', 'c1', 'quote-123', 'op1');
            
            expect(order).toEqual(fallbackOrder);
            expect(mockDb.update).not.toHaveBeenCalled();
            expect(conversationService.changeConversationStage).not.toHaveBeenCalled();
            expect(redisClient.eval).toHaveBeenCalled();
        });
    });

    describe('Lock TTL and release guarantees', () => {
        it('should acquire the quote-to-order lock with a TTL', async () => {
            const mockQuote = { id: 'quote-lock-ttl', tenantId: 'tenant-1', customerId: 'cust', organizationId: 'org', status: 'ACCEPTED', bestPrice: '50.00', bestCarrier: 'Jadlog', bestService: 'Package' };

            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn()
                    .mockResolvedValueOnce([{ planStatus: 'active' }])
                    .mockResolvedValueOnce([mockQuote])
                    .mockResolvedValueOnce([])
                    .mockResolvedValueOnce([{ id: 'new-order' }])
                    .mockResolvedValueOnce([]),
                insert: vi.fn().mockReturnThis(),
                values: vi.fn().mockResolvedValue([]),
                update: vi.fn().mockReturnThis(),
                set: vi.fn().mockReturnThis(),
            };
            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            await orderService.createOrderFromQuote('tenant-1', 'conv-1', 'quote-lock-ttl', 'op-1');

            expect(redisClient.setNx).toHaveBeenCalledWith(
                'lock:quote-to-order:tenant-1:quote-lock-ttl',
                expect.any(String),
                expect.any(Number)
            );
        });

        it('should release the lock in finally even when an error is thrown mid-processing', async () => {
            vi.mocked(redisClient.setNx).mockResolvedValueOnce(true);

            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn()
                    .mockResolvedValueOnce([{ planStatus: 'active' }])
                    .mockResolvedValueOnce([{ id: 'quote-err', status: 'ACCEPTED' }])
                    .mockResolvedValueOnce([]), // idempotency guard — no existing order
                insert: vi.fn().mockReturnThis(),
                values: vi.fn().mockRejectedValueOnce(new Error('DB write failure')),
                update: vi.fn().mockReturnThis(),
                set: vi.fn().mockReturnThis(),
            };
            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            await expect(
                orderService.createOrderFromQuote('tenant-1', 'conv-1', 'quote-err', 'op-1')
            ).rejects.toThrow('DB write failure');

            // Lock must be released via eval even when the operation throws
            expect(redisClient.eval).toHaveBeenCalledTimes(1);
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
                limit: vi.fn()
                    .mockResolvedValueOnce([{ id: 'order-1', customerId: 'cust-1', status: 'DRAFT', conversationId: 'conv-1' }])
                    .mockResolvedValueOnce([{ planStatus: 'active' }])
            };

            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            await orderService.updateOrderStatus('tenant-1', 'order-1', 'CONFIRMED');

            expect(shipmentService.createShipmentFromOrder).toHaveBeenCalledWith('tenant-1', 'order-1');
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

        it('should block order confirmation when tenant billing status is not allowed', async () => {
            const mockDb = {
                update: vi.fn().mockReturnThis(),
                set: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                limit: vi.fn()
                    .mockResolvedValueOnce([{ id: 'order-1', customerId: 'cust-1', status: 'DRAFT', conversationId: 'conv-1' }])
                    .mockResolvedValueOnce([{ planStatus: 'past_due' }])
            };

            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            await expect(orderService.updateOrderStatus('tenant-1', 'order-1', 'CONFIRMED'))
                .rejects.toThrow("Tenant subscription status 'past_due' does not allow order creation or confirmation.");

            expect(mockDb.update).not.toHaveBeenCalled();
            expect(publishOperationalEvent).not.toHaveBeenCalled();
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
            limit: vi.fn()
                .mockResolvedValueOnce([{ planStatus: 'active' }])
                .mockResolvedValueOnce([]), // no quotes returned
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await expect(
            orderService.createOrderFromQuote('tenant-1', 'conv-123', 'invalid-quote', 'operator-999')
        ).rejects.toThrow('Quote not found');
    });

    it('should block order creation when tenant billing status is not allowed', async () => {
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([{ planStatus: 'past_due' }]),
            insert: vi.fn(),
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await expect(
            orderService.createOrderFromQuote('tenant-1', 'conv-123', 'quote-456', 'operator-999')
        ).rejects.toThrow("Tenant subscription status 'past_due' does not allow order creation or confirmation.");

        expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should require quote approval before converting to order', async () => {
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn()
                .mockResolvedValueOnce([{ planStatus: 'active' }])
                .mockResolvedValueOnce([{ id: 'quote-1', status: 'SENT' }]),
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await expect(
            orderService.createOrderFromQuote('tenant-1', 'conv-1', 'quote-1', 'op-1')
        ).rejects.toThrow('Cannot convert quote with status: SENT');
    });

    it('should prevent conversion if quote status is EXPIRED, CANCELED, or LOST', async () => {
        const statuses = ['EXPIRED', 'CANCELED', 'LOST'];
        for (const status of statuses) {
            const mockQuote = { id: 'quote-1', status };
            const mockDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn()
                    .mockResolvedValueOnce([{ planStatus: 'active' }])
                    .mockResolvedValueOnce([mockQuote]),
            };
            vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

            await expect(
                orderService.createOrderFromQuote('tenant-1', 'conv-1', 'quote-1', 'op-1')
            ).rejects.toThrow(`Cannot convert quote with status: ${status}`);
        }
    });

    it('should return the existing order when the quote is already converted', async () => {
        const existingOrder = { id: 'order-existing', quoteId: 'quote-3' };
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn()
                .mockResolvedValueOnce([{ planStatus: 'active' }])
                .mockResolvedValueOnce([{ id: 'quote-3', status: 'CONVERTED' }])
                .mockResolvedValueOnce([existingOrder]),
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        const result = await orderService.createOrderFromQuote('tenant-1', 'conv-1', 'quote-3', 'op-1');

        expect(result).toEqual(existingOrder);
        expect(redisClient.setNx).not.toHaveBeenCalled();
    });

    it('should dynamically expire a quote and prevent conversion if expiresAt is in the past', async () => {
        const pastDate = new Date(Date.now() - 100000);
        const mockQuote = { id: 'quote-2', status: 'ACCEPTED', expiresAt: pastDate };
        
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn()
                .mockResolvedValueOnce([{ planStatus: 'active' }])
                .mockResolvedValueOnce([mockQuote]),
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
