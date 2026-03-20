import { describe, it, expect, vi, beforeEach } from 'vitest';
import { frankContextBuilder } from '../frank.context-builder';
import { getDb } from '@/infra/db';

vi.mock('@/infra/db', async () => {
    const actual = await vi.importActual<typeof import('@/infra/db')>('@/infra/db');
    return {
        ...actual,
        getDb: vi.fn(),
    };
});

describe('Frank Context Builder', () => {
    let mockDb: any;
    let limitMock: any;
    let whereMock: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        limitMock = vi.fn();
        whereMock = vi.fn().mockReturnThis();

        // Create a self-referencing chain object
        const mockChain = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: limitMock,      // Notice limitMock is not chained to mockReturnThis, it resolves directly
            filter: vi.fn().mockReturnThis(),
        };

        // Fix all intermediate methods so they ALWAYS return the object containing the `limit` function
        mockChain.select.mockReturnValue(mockChain);
        mockChain.from.mockReturnValue(mockChain);
        mockChain.where.mockReturnValue(mockChain);
        mockChain.orderBy.mockReturnValue(mockChain);

        mockDb = mockChain;

        vi.mocked(getDb).mockResolvedValue(mockDb as any);
    });

    it('should throw error if conversation is not found or isolated by tenantId', async () => {
        limitMock.mockResolvedValueOnce([]); // Empty conversation result

        await expect(frankContextBuilder.buildContext('tenant-x', 'conv-1'))
            .rejects
            .toThrow('Conversation not found or access denied: conv-1');
    });

    it('should safely limit timeline to 20 messages and map roles properly', async () => {
        const mockConv = [{ id: 'conv-1', stage: 'NEW_LEAD', customerId: null, assignedTo: 'op-1' }];
        
        const mockMessages = Array.from({ length: 20 }).map((_, i) => ({
            id: `msg-${i}`,
            direction: i % 2 === 0 ? 'inbound' : 'outbound',
            source: i === 1 ? 'SYSTEM' : 'OPERATOR',
            message: `Hello ${i}`,
            createdAt: new Date(`2026-03-01T10:00:${i.toString().padStart(2, '0')}.000Z`)
        }));

        limitMock.mockResolvedValueOnce(mockConv);
        limitMock.mockResolvedValueOnce(mockMessages);

        const result = await frankContextBuilder.buildContext('tenant-x', 'conv-1');

        expect(result.conversation.id).toBe('conv-1');
        expect(result.conversation.messages).toHaveLength(20);
        
        expect(result.conversation.messages[19].role).toBe('user'); 
        expect(result.conversation.messages[18].role).toBe('system'); 
        expect(result.conversation.messages[17].role).toBe('user'); 
        expect(result.conversation.messages[16].role).toBe('assistant');
    });

    it('should query full customer CRM context if customerId is present', async () => {
        const mockConv = [{ id: 'conv-2', stage: 'IN_ATTENDANCE', customerId: 'cust-1', assignedTo: 'op-2' }];
        const mockCustomer = [{ id: 'cust-1', name: 'John Doe' }];
        const mockQuotes = [
            { id: 'q1', status: 'DRAFT', createdAt: new Date() },
            { id: 'q2', status: 'WON', createdAt: new Date() }
        ];
        const mockOrders = [
            { id: 'o1', status: 'CONFIRMED', price: '150.00', createdAt: new Date() },
            { id: 'o2', status: 'CANCELED', price: '50.00', createdAt: new Date() }
        ];
        const mockTasks = [{ id: 't1' }];
        const mockNotes = [{ id: 'n1' }, { id: 'n2' }];

        limitMock
            .mockResolvedValueOnce(mockConv)      // 1. Conversation
            .mockResolvedValueOnce([])            // 2. Messages
            .mockResolvedValueOnce(mockCustomer)  // 3. Customer Base
            .mockResolvedValueOnce([{ name: 'John Doe' }])  // 4. Customer Contacts Name
            .mockResolvedValueOnce(mockQuotes)    // 5. Quotes
            .mockResolvedValueOnce(mockOrders)    // 6. Orders
            .mockResolvedValueOnce(mockNotes);    // 7. Notes (has a limit block)

        // For tasks, the query terminates on `where()`, so we need to orchestrate:
        // By changing `where()` dynamically based on call number or overriding it locally:
        // We will just let `where` return the mockTask data when it is called on the 'crmTasks' flow
        // The safest vitest way is to intercept the 6th call to where, or hijack it for the entire block:
        
        // Since where mockReturnThis overrode all values, we will explicitly change
        // what `where` returns when called. However, it's easier to just push
        // tasks via the limit block. wait, `mockDb.filter` doesn't exist, we must inject tasks in where.
        
        let whereCallCount = 0;
        mockDb.where.mockImplementation(() => {
            whereCallCount++;
            // The 7th query is tasks:
            // 1=conv, 2=msgs, 3=cust, 4=contact, 5=quotes, 6=orders, 7=tasks, 8=notes
            if (whereCallCount === 7) {
                return Promise.resolve(mockTasks);
            }
            return mockDb;
        });

        const result = await frankContextBuilder.buildContext('tenant-x', 'conv-2');

        expect(result.customer).toBeDefined();
        expect(result.customer?.name).toBe('John Doe');
        expect(result.customer?.totalQuotes).toBe(2);
        expect(result.customer?.totalOrders).toBe(1);
        expect(result.customer?.averageTicket).toBe(150);
        
        expect(result.pipeline.recentQuotes).toHaveLength(2);
        expect(result.pipeline.recentOrders).toHaveLength(2);
    });
});
