import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processDomineEvent } from '../processor';
import { domineEventsRepository } from '../../../infra/repositories/domine-events.repository';

vi.mock('../../../infra/repositories/domine-events.repository', () => ({
    domineEventsRepository: {
        markProcessed: vi.fn(),
        sendToDLQ: vi.fn(),
    }
}));

describe('Domine Processor Loop', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('processes event and marks as processed', async () => {
        const event = { id: 'evt-1', type: 'order.created', tenantId: 'LOJACOND' };

        await processDomineEvent(event);

        expect(domineEventsRepository.markProcessed).toHaveBeenCalledWith('evt-1');
        expect(domineEventsRepository.sendToDLQ).not.toHaveBeenCalled();
    });

    it('handles failure by setting nextRetryAt with backoff when under max attempts', async () => {
        const event = { id: 'evt-fail', type: 'fail_me', tenantId: 'LOJACOND', attempts: 0 };

        await processDomineEvent(event);

        expect(domineEventsRepository.markProcessed).not.toHaveBeenCalled();
        expect(domineEventsRepository.sendToDLQ).toHaveBeenCalledWith(
            'evt-fail',
            'PROCESSOR_ERROR',
            'Forced failure for testing',
            expect.any(Date),
            1
        );
    });

    it('escalates to hard DLQ (no nextRetryAt) when max attempts exceeded', async () => {
        const event = { id: 'evt-dlq', type: 'fail_me', tenantId: 'LOJACOND', attempts: 4 }; // index out of bounds on RETRY_BACKOFFS

        await processDomineEvent(event);

        expect(domineEventsRepository.markProcessed).not.toHaveBeenCalled();
        expect(domineEventsRepository.sendToDLQ).toHaveBeenCalledWith(
            'evt-dlq',
            'MAX_RETRIES_EXCEEDED',
            'Forced failure for testing',
            null,
            5
        );
    });
});
