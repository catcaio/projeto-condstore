import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock state ─────────────────────────────────────────────────────────────

let _events: any[] = [];
let _dlqEntries: any[] = [];
let _lockCallCount = 0;
const TEST_TENANT = 'TEST_TENANT';

vi.mock('../../tenant', () => ({
    isDomineEnabled: vi.fn(async (tenantId: string) => tenantId === TEST_TENANT),
}));

function resetState() {
    _events = [];
    _dlqEntries = [];
    _lockCallCount = 0;
}

vi.mock('@/infra/repositories/domine-events.repository', () => ({
    domineEventsRepository: {
        lockAndGetNextEvent: vi.fn(async () => {
            _lockCallCount++;
            const idx = _events.findIndex(e =>
                e.status === 'queued' || (e.status === 'failed' && (!e.nextRetryAt || e.nextRetryAt <= new Date()))
            );
            if (idx === -1) return null;
            _events[idx].status = 'processing';
            return { ..._events[idx] };
        }),
        markDone: vi.fn(async (id: string) => {
            const e = _events.find(ev => ev.id === id);
            if (e) { e.status = 'completed'; e.processedAt = new Date(); }
        }),
        markFailed: vi.fn(async (id: string, code: string, msg?: string) => {
            const e = _events.find(ev => ev.id === id);
            if (!e) return;
            e.retryCount = (e.retryCount ?? 0) + 1;
            if (e.retryCount >= 4) {
                e.status = 'dead_letter';
                _dlqEntries.push({ eventId: id, reason: msg });
            } else {
                e.status = 'failed';
                e.nextRetryAt = new Date(Date.now() + 60_000);
            }
        }),
        sendToDLQ: vi.fn(async (id: string, reason: string) => {
            const e = _events.find(ev => ev.id === id);
            if (e) e.status = 'dead_letter';
            _dlqEntries.push({ eventId: id, reason });
        }),
        reapStaleProcessing: vi.fn(async (tenantId: string, staleMinutes: number) => {
            const cutoff = Date.now() - staleMinutes * 60_000;
            let reaped = 0;
            for (const e of _events) {
                if (e.tenantId === tenantId && e.status === 'processing' && e.staleSince && e.staleSince < cutoff) {
                    e.status = 'failed';
                    e.errorCode = 'STALE_PROCESSING';
                    reaped++;
                }
            }
            return reaped;
        }),
    },
}));

vi.mock('@/domine/processor/dispatcher', () => ({
    dispatchEvent: vi.fn(async (event: any) => {
        if (event.payloadJson?.shouldFail) return { ok: false, error: 'test failure' };
        return { ok: true };
    }),
}));

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { processOnce, loop } from '../domine-processor';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('DomineProcessor - processOnce', () => {
    beforeEach(() => resetState());

    it('returns empty when no events are available', async () => {
        const result = await processOnce(TEST_TENANT);
        expect(result).toBe('empty');
    });

    it('processes a queued event and marks it complete', async () => {
        _events.push({ id: 'evt-1', tenantId: TEST_TENANT, type: 'FINOPS_EVENT', source: 'cockpit', status: 'queued', payloadJson: {} });

        const result = await processOnce(TEST_TENANT);
        expect(result).toBe('completed');
        expect(_events[0].status).toBe('completed');
    });

    it('marks event as failed when handler returns failure', async () => {
        _events.push({ id: 'evt-2', tenantId: TEST_TENANT, type: 'TEST', source: 'cockpit', status: 'queued', payloadJson: { shouldFail: true }, retryCount: 0 });

        const result = await processOnce(TEST_TENANT);
        expect(result).toBe('failed');
        expect(_events[0].status).toBe('failed');
    });
});

describe('DomineProcessor - loop', () => {
    beforeEach(() => resetState());

    it('processes multiple events in a single loop', async () => {
        _events.push(
            { id: 'e1', tenantId: TEST_TENANT, type: 'A', source: 'cockpit', status: 'queued', payloadJson: {} },
            { id: 'e2', tenantId: TEST_TENANT, type: 'B', source: 'cockpit', status: 'queued', payloadJson: {} },
            { id: 'e3', tenantId: TEST_TENANT, type: 'C', source: 'cockpit', status: 'queued', payloadJson: {} },
        );

        const stats = await loop(TEST_TENANT, 10, 10_000);
        expect(stats.processed).toBe(3);
        expect(stats.iterations).toBeGreaterThanOrEqual(3);
    });

    it('rejects tenants without domine enabled', async () => {
        await expect(loop('OTHER', 10, 10_000)).rejects.toThrow('not enabled');
    });

    it('respects max event limit', async () => {
        for (let i = 0; i < 10; i++) {
            _events.push({ id: `e${i}`, tenantId: TEST_TENANT, type: 'A', source: 'cockpit', status: 'queued', payloadJson: {} });
        }

        const stats = await loop(TEST_TENANT, 3, 10_000);
        expect(stats.processed).toBe(3);
    });
});

describe('DomineProcessor - lock concurrency', () => {
    beforeEach(() => resetState());

    it('two concurrent processOnce calls do not process the same event twice', async () => {
        _events.push({ id: 'evt-shared', tenantId: TEST_TENANT, type: 'X', source: 'cockpit', status: 'queued', payloadJson: {} });

        // Simulate two concurrent calls
        const [r1, r2] = await Promise.all([
            processOnce(TEST_TENANT),
            processOnce(TEST_TENANT),
        ]);

        // One should complete, the other should find empty (already locked)
        const results = [r1, r2].sort();
        expect(results).toContain('completed');
        expect(results).toContain('empty');
    });
});

describe('DomineProcessor - reaper', () => {
    beforeEach(() => resetState());

    it('recovers stale processing events via reaper in loop', async () => {
        _events.push({
            id: 'stale-1',
            tenantId: TEST_TENANT,
            type: 'A',
            source: 'cockpit',
            status: 'processing',
            payloadJson: {},
            staleSince: Date.now() - 10 * 60_000, // 10 minutes ago
        });

        // After reap, this should become 'failed' and then be picked up
        const stats = await loop(TEST_TENANT, 10, 10_000);
        // Reaper should have been called
        const { domineEventsRepository: repo } = await import('@/infra/repositories/domine-events.repository');
        expect(vi.mocked(repo.reapStaleProcessing)).toHaveBeenCalledWith(TEST_TENANT, 5);
    });
});

describe('DomineProcessor - backoff + DLQ', () => {
    beforeEach(() => resetState());

    it('moves event to DLQ after max retries', async () => {
        _events.push({
            id: 'fail-loop',
            tenantId: TEST_TENANT,
            type: 'FAIL',
            source: 'cockpit',
            status: 'queued',
            payloadJson: { shouldFail: true },
            retryCount: 3, // will become 4 → DLQ
        });

        await processOnce(TEST_TENANT);
        expect(_events[0].status).toBe('dead_letter');
        expect(_dlqEntries.length).toBe(1);
    });
});
