/**
 * Tests for the Domine Event Processor v1.
 *
 * Covers: idempotency, retry, DLQ, processing success, processing failure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNextRetryAt, shouldMoveToDLQ, MAX_RETRIES } from '../retry-policy';
import { dispatchEvent, registerHandler } from '../dispatcher';
import type { EventHandler, EventHandlerResult } from '../dispatcher';
import { processorMetrics, resetMetrics } from '../processor';

// ─── Retry Policy ──────────────────────────────────────────────────────────
describe('Retry Policy', () => {
    it('returns a Date for retries below MAX_RETRIES', () => {
        for (let i = 0; i < MAX_RETRIES; i++) {
            const next = getNextRetryAt(i);
            expect(next).toBeInstanceOf(Date);
        }
    });

    it('returns null when retries reach MAX_RETRIES', () => {
        expect(getNextRetryAt(MAX_RETRIES)).toBeNull();
        expect(getNextRetryAt(MAX_RETRIES + 1)).toBeNull();
    });

    it('shouldMoveToDLQ is true at MAX_RETRIES', () => {
        expect(shouldMoveToDLQ(MAX_RETRIES - 1)).toBe(false);
        expect(shouldMoveToDLQ(MAX_RETRIES)).toBe(true);
    });

    it('first retry has 1m delay', () => {
        const before = Date.now();
        const next = getNextRetryAt(0);
        expect(next!.getTime()).toBeGreaterThanOrEqual(before);
        // ~60 seconds delay (1m backoff)
        expect(next!.getTime() - before).toBeGreaterThanOrEqual(59_000);
        expect(next!.getTime() - before).toBeLessThan(61_000);
    });

    it('subsequent retries have increasing delays', () => {
        const r1 = getNextRetryAt(1)!.getTime();
        const r2 = getNextRetryAt(2)!.getTime();
        const r3 = getNextRetryAt(3)!.getTime();
        expect(r2).toBeGreaterThan(r1);
        expect(r3).toBeGreaterThan(r2);
    });
});

// ─── Dispatcher ────────────────────────────────────────────────────────────
describe('Dispatcher', () => {
    it('returns ok:true when no handler is registered for event type', async () => {
        const result = await dispatchEvent({
            id: 'evt-1',
            tenantId: 'tenant-1',
            type: 'unknown_event_type',
            source: 'test',
            payloadJson: {},
        });
        expect(result.ok).toBe(true);
    });

    it('dispatches to registered handler', async () => {
        const handler: EventHandler = {
            eventType: 'test.success',
            handle: vi.fn(async () => ({ ok: true })),
        };
        registerHandler(handler);

        const result = await dispatchEvent({
            id: 'evt-2',
            tenantId: 'tenant-1',
            type: 'test.success',
            source: 'test',
            payloadJson: { foo: 'bar' },
        });

        expect(result.ok).toBe(true);
        expect(handler.handle).toHaveBeenCalledOnce();
    });

    it('returns failure from handler', async () => {
        const handler: EventHandler = {
            eventType: 'test.fail',
            handle: vi.fn(async () => ({ ok: false, error: 'boom' })),
        };
        registerHandler(handler);

        const result = await dispatchEvent({
            id: 'evt-3',
            tenantId: 'tenant-1',
            type: 'test.fail',
            source: 'test',
            payloadJson: {},
        });

        expect(result.ok).toBe(false);
        expect(result.error).toBe('boom');
    });
});

// ─── Processor Metrics ─────────────────────────────────────────────────────
describe('Processor Metrics', () => {
    beforeEach(() => {
        resetMetrics();
    });

    it('starts at zero', () => {
        expect(processorMetrics.processed).toBe(0);
        expect(processorMetrics.failed).toBe(0);
        expect(processorMetrics.retried).toBe(0);
        expect(processorMetrics.dlq).toBe(0);
    });

    it('resets correctly', () => {
        processorMetrics.processed = 10;
        processorMetrics.dlq = 3;
        resetMetrics();
        expect(processorMetrics.processed).toBe(0);
        expect(processorMetrics.dlq).toBe(0);
    });
});

// ─── processEvent (unit-level with mock DB) ────────────────────────────────
describe('processEvent with mock DB', () => {
    // We import processEvent dynamically to mock DB
    it('returns not_found for missing event', async () => {
        const { processEvent } = await import('../processor');

        const mockDb = {
            select: vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([]),
                    then: (resolve: any) => resolve([]),
                    }),
                }),
            }),
        };

        const result = await processEvent(mockDb, 'missing-id');
        expect(result.status).toBe('not_found');
    });

    it('processes event successfully when handler returns ok', async () => {
        const { processEvent } = await import('../processor');

        const mockEvent = {
            id: 'evt-ok',
            tenantId: 'tenant-1',
            type: 'test.success', // handler registered above
            source: 'test',
            payloadJson: {},
            retryCount: 0,
        };

        const updateSets: any[] = [];

        const mockDb = {
            select: vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([mockEvent]),
                    then: (resolve: any) => resolve([mockEvent]),
                    }),
                }),
            }),
            update: vi.fn().mockReturnValue({
                set: vi.fn().mockImplementation((data: any) => {
                    updateSets.push(data);
                    return {
                        where: vi.fn().mockResolvedValue(undefined),
                    };
                }),
            }),
        };

        const result = await processEvent(mockDb, 'evt-ok');
        expect(result.status).toBe('completed');
        expect(updateSets.some((s: any) => s.status === 'completed')).toBe(true);
    });

    it('schedules retry when handler fails and retryCount < MAX', async () => {
        const { processEvent } = await import('../processor');

        // Register a failing handler for this test
        registerHandler({
            eventType: 'test.retry_me',
            handle: async () => ({ ok: false, error: 'temporary failure' }),
        });

        const mockEvent = {
            id: 'evt-retry',
            tenantId: 'tenant-1',
            type: 'test.retry_me',
            source: 'test',
            payloadJson: {},
            retryCount: 0,
        };

        const updateSets: any[] = [];
        const mockDb = {
            select: vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([mockEvent]),
                    then: (resolve: any) => resolve([mockEvent]),
                    }),
                }),
            }),
            update: vi.fn().mockReturnValue({
                set: vi.fn().mockImplementation((data: any) => {
                    updateSets.push(data);
                    return {
                        where: vi.fn().mockResolvedValue(undefined),
                    };
                }),
            }),
        };

        const result = await processEvent(mockDb, 'evt-retry');
        expect(result.status).toBe('retried');
        expect(updateSets.some((s: any) => s.status === 'failed')).toBe(true);
    });

    it('moves to DLQ when handler fails and retryCount >= MAX', async () => {
        const { processEvent } = await import('../processor');

        registerHandler({
            eventType: 'test.dlq_me',
            handle: async () => ({ ok: false, error: 'permanent failure' }),
        });

        const mockEvent = {
            id: 'evt-dlq',
            tenantId: 'tenant-1',
            type: 'test.dlq_me',
            source: 'test',
            payloadJson: {},
            retryCount: MAX_RETRIES, // already at max
        };

        const updateSets: any[] = [];
        const insertedDlq: any[] = [];
        const mockDb = {
            select: vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([mockEvent]),
                    then: (resolve: any) => resolve([mockEvent]),
                    }),
                }),
            }),
            update: vi.fn().mockReturnValue({
                set: vi.fn().mockImplementation((data: any) => {
                    updateSets.push(data);
                    return {
                        where: vi.fn().mockResolvedValue(undefined),
                    };
                }),
            }),
            insert: vi.fn().mockReturnValue({
                values: vi.fn().mockImplementation((data: any) => {
                    insertedDlq.push(data);
                    return Promise.resolve();
                }),
            }),
        };

        const result = await processEvent(mockDb, 'evt-dlq');
        expect(result.status).toBe('dlq');
        expect(updateSets.some((s: any) => s.status === 'dead_letter')).toBe(true);
        expect(insertedDlq.length).toBe(1);
        expect(insertedDlq[0].failureReason).toBe('permanent failure');
    });
});
