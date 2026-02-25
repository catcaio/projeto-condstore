
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { funnelRepository, FunnelStage } from '../funnel.repository';
import { freightFunnelEvents } from '../../../drizzle/schema';
import { redisClient } from '../../../infra/redis.client';

// Mock dependencies
const mockDb = {
    insert: vi.fn(),
    values: vi.fn(),
    onDuplicateKeyUpdate: vi.fn(),
};

// Setup chainable mocks
mockDb.insert.mockReturnValue(mockDb);
mockDb.values.mockReturnValue(mockDb);
mockDb.onDuplicateKeyUpdate.mockResolvedValue(undefined);

vi.mock('../../../infra/db', () => ({
    getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock('../../../infra/logger', () => ({
    logger: {
        warn: vi.fn(),
    },
}));

vi.mock('../../../infra/redis.client', () => ({
    redisClient: {
        isAvailable: vi.fn().mockReturnValue(false),
        del: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('FunnelRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should save a funnel event with phone number and session', async () => {
        vi.mocked(redisClient.isAvailable).mockReturnValue(true);

        const input = {
            tenantId: 'tenant-123',
            phoneNumber: '5511999999999',
            stage: FunnelStage.FLOW_STARTED,
            sessionId: 'session-abc-123',
        };

        await funnelRepository.saveEvent(input);

        expect(mockDb.insert).toHaveBeenCalledWith(freightFunnelEvents);
        expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: input.tenantId,
            stage: input.stage,
            phoneNumber: input.phoneNumber,
            sessionId: input.sessionId,
        }));
        expect(mockDb.onDuplicateKeyUpdate).toHaveBeenCalled();
        expect(redisClient.del).toHaveBeenCalledWith('cockpit:metrics:funnel:tenant-123');
    });

    it('should not throw if database operation fails', async () => {
        mockDb.onDuplicateKeyUpdate.mockRejectedValue(new Error('DB Error'));

        const input = {
            tenantId: 'tenant-123',
            phoneNumber: '5511999999999',
            stage: FunnelStage.FLOW_STARTED,
            sessionId: 'session-error-test',
        };

        await expect(funnelRepository.saveEvent(input)).resolves.not.toThrow();
    });
});
