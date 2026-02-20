
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { funnelRepository, FunnelStage } from '../funnel.repository';
import { freightFunnelEvents } from '../../../drizzle/schema';

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

describe('FunnelRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should save a funnel event with phone number and session', async () => {
        const input = {
            tenantId: 'tenant-123',
            phoneNumber: '5511999999999',
            stage: FunnelStage.FLOW_STARTED,
            messageSid: 'msg-123',
        };

        await funnelRepository.saveEvent(input);

        expect(mockDb.insert).toHaveBeenCalledWith(freightFunnelEvents);
        expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: input.tenantId,
            stage: input.stage,
            phoneNumber: input.phoneNumber,
            sessionId: input.messageSid,
        }));
        expect(mockDb.onDuplicateKeyUpdate).toHaveBeenCalled();
    });

    it('should not throw if database operation fails', async () => {
        mockDb.onDuplicateKeyUpdate.mockRejectedValue(new Error('DB Error'));

        const input = {
            tenantId: 'tenant-123',
            phoneNumber: '5511999999999',
            stage: FunnelStage.FLOW_STARTED,
        };

        await expect(funnelRepository.saveEvent(input)).resolves.not.toThrow();
    });
});
