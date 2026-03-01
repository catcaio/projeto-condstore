import { describe, it, expect, vi, beforeEach } from 'vitest';
import { domineEventBus } from '../event-bus.service';
import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';
import * as eventProcessor from '../event-processor';

// Mock DB Repos
vi.mock('@/infra/repositories/domine-events.repository', () => {
    return {
        domineEventsRepository: {
            publish: vi.fn(),
            markProcessed: vi.fn(),
            getById: vi.fn(),
            sendToDLQ: vi.fn(),
            getDLQCount: vi.fn().mockResolvedValue(0),
            lockAndGetNextEvent: vi.fn(),
            getDomineOperationalStats: vi.fn().mockResolvedValue({ oldestUnprocessedEventAge: 0 })
        }
    };
});

describe('Domine Concurrency Harness', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('prevents double execution if eventbus is triggered simultaneously by two sources', async () => {
        const spyProcessor = vi.spyOn(eventProcessor, 'processDomineEvent').mockResolvedValue(undefined);

        // Sequence: 
        // 1st lockAndGetNextEvent returns the event
        // 2nd lockAndGetNextEvent (from concurrent run) returns null because the first one locked it.
        // next return is null to break out of the first loop
        vi.mocked(domineEventsRepository.lockAndGetNextEvent)
            .mockResolvedValueOnce({ id: 'event-sync' })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        vi.mocked(domineEventsRepository.getById).mockResolvedValue({
            id: 'event-sync',
            tenantId: 'tenant-abc',
            source: 'webhook',
            type: 'dummy_event',
            idempotencyKey: 'idem-1',
            payloadJson: {},
            createdAt: new Date(),
            status: 'queued'
        } as any);

        // Emit two independent parallel triggers (could be 2 machines picking up same signal)
        await Promise.all([
            domineEventBus.processAsync('tenant-abc'),
            domineEventBus.processAsync('tenant-abc')
        ]);

        // Assert the processor logic was strictly hit ONE time
        expect(spyProcessor).toHaveBeenCalledTimes(1);
        expect(domineEventsRepository.markProcessed).toHaveBeenCalledTimes(1);
    });
});
