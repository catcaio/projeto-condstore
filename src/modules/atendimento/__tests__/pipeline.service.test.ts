import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pipelineMetricsService } from '../pipeline-metrics.service';
import * as dbInfra from '@/infra/db';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { conversationService } from '../conversation.service';

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/lib/events/operational-event-bus', () => ({
    publishOperationalEvent: vi.fn(),
}));

// Quick mock for conversation repo since it is exported as a const object
vi.mock('../conversation.repository', () => ({
    conversationRepository: {
        updateConversationStage: vi.fn().mockResolvedValue(true),
        getConversationById: vi.fn().mockResolvedValue({ id: 'conv-123', stage: 'NEW_LEAD', version: 0 }),
    }
}));

describe('Pipeline Metrics Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should calculate conversion rate properly', async () => {
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn()
                .mockResolvedValueOnce([{ count: 10 }]) // total leads
                .mockResolvedValueOnce([{ count: 2 }])  // deals won
                .mockResolvedValueOnce([{ count: 5 }])  // deals lost
                .mockResolvedValueOnce([{ count: 4 }])  // quotes sent
                .mockResolvedValueOnce([{ avgVal: 1500.50 }]) // avg quote
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        const metrics = await pipelineMetricsService.getMetrics('tenant-1');
        
        expect(metrics.totalLeads).toBe(10);
        expect(metrics.dealsWon).toBe(2);
        expect(metrics.opportunitiesLost).toBe(5);
        expect(metrics.totalQuotesSent).toBe(4);
        expect(metrics.avgQuoteValue).toBe(1500.50);
        expect(metrics.conversionRate).toBe(20); // (2 / 10) * 100
    });

    it('should safely handle zero leads without crashing or providing NaN', async () => {
        const mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn()
                .mockResolvedValueOnce([{ count: 0 }]) // total leads
                .mockResolvedValueOnce([{ count: 0 }])  // deals won
                .mockResolvedValueOnce([{ count: 0 }])  // deals lost
                .mockResolvedValueOnce([{ count: 0 }])  // quotes sent
                .mockResolvedValueOnce([{ avgVal: 0 }]) // avg quote
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        const metrics = await pipelineMetricsService.getMetrics('tenant-1');
        
        expect(metrics.totalLeads).toBe(0);
        expect(metrics.conversionRate).toBe(0); 
    });
});

describe('Conversation Service - Stage Changes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fire correct operational events on stage change (DEAL_WON)', async () => {
        const { conversationRepository } = await import('../conversation.repository');
        await conversationService.changeConversationStage('tenant-1', 'conv-123', 'WON', 'cust-456');

        expect(conversationRepository.updateConversationStage).toHaveBeenCalledWith(
            'tenant-1',
            'conv-123',
            0,
            'WON',
            undefined
        );
        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            eventType: 'deal_won',
            customerId: 'cust-456',
            payload: {
                conversationId: 'conv-123',
                stage: 'WON'
            }
        }));
    });
    
    it('should fire DEAL_LOST for lost ops', async () => {
        await conversationService.changeConversationStage('tenant-1', 'conv-123', 'LOST', 'cust-456');

        expect(publishOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'deal_lost'
        }));
    });

    it('should not allow regression from an advanced stage back to a basic one', async () => {
        const { conversationRepository } = await import('../conversation.repository');
        vi.mocked(conversationRepository.getConversationById).mockResolvedValueOnce({
            id: 'conv-123',
            stage: 'QUOTED',
            version: 5
        } as any);

        await conversationService.changeConversationStage('tenant-1', 'conv-123', 'IN_ATTENDANCE', 'cust-456');

        expect(conversationRepository.updateConversationStage).not.toHaveBeenCalled();
        expect(publishOperationalEvent).not.toHaveBeenCalled();
    });

    it('should throw conflict error when optimistic locking detects stale write', async () => {
        const { conversationRepository } = await import('../conversation.repository');
        vi.mocked(conversationRepository.updateConversationStage).mockResolvedValueOnce(false);

        await expect(
            conversationService.changeConversationStage('tenant-1', 'conv-123', 'WON', 'cust-456')
        ).rejects.toMatchObject({
            name: 'ConversationStageConflictError',
        });

        expect(publishOperationalEvent).not.toHaveBeenCalled();
    });
});
