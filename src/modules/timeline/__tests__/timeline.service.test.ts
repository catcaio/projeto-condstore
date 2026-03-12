import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetEvents = vi.hoisted(() => vi.fn());

vi.mock('../timeline.repository', () => ({
    get timelineRepository() {
        return {
            getEvents: mockGetEvents
        };
    },
    TimelineRepository: vi.fn()
}));

import { TimelineService } from '../timeline.service';
import { timelineRepository } from '../timeline.repository';

// We mock the mapper behavior partly by just providing a dummy generic payload 
// as `operationalEvents` from DB schema.
describe('TimelineService', () => {
    let service: TimelineService;

    beforeEach(() => {
        service = new TimelineService(timelineRepository as any);
        vi.clearAllMocks();
    });

    it('should paginate and filter by tenant', async () => {
        const dnow = new Date();
        const mockRows = [
            { id: '1', tenantId: 't1', eventType: 'order_created', payload: {}, createdAt: dnow },
            { id: '2', tenantId: 't1', eventType: 'conversation_created', payload: {}, createdAt: dnow },
            { id: '3', tenantId: 't1', eventType: 'custom_field_value_set', payload: { entity: 'customer', fieldKey: 'cpf' }, createdAt: dnow }
        ];

        mockGetEvents.mockResolvedValueOnce(mockRows);

        const res = await service.getTimeline('t1', 2);
        
        expect(mockGetEvents).toHaveBeenCalledWith('t1', 3, undefined, undefined);
        expect(res.events).toHaveLength(2);
        expect(res.nextCursor).toBe(mockRows[1].createdAt); 
        expect(res.events[0].eventType).toBe('order_created');
        expect(res.events[1].eventType).toBe('conversation_created');
    });

    it('should filter by timeline entity conceptually (post-db)', async () => {
        const dnow = new Date();
        const mockRows = [
            { id: '1', tenantId: 't1', eventType: 'order_created', payload: {}, createdAt: dnow }, // maps to 'order'
            { id: '2', tenantId: 't1', eventType: 'conversation_created', payload: {}, createdAt: dnow }, // maps to 'conversation'
        ];

        mockGetEvents.mockResolvedValueOnce(mockRows);

        const res = await service.getTimeline('t1', 10, undefined, 'conversation');
        
        expect(mockGetEvents).toHaveBeenCalledWith('t1', 11, undefined, undefined);
        expect(res.events).toHaveLength(1);
        expect(res.events[0].entity).toBe('conversation');
    });

});
