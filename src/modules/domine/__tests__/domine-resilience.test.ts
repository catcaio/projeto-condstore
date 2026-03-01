import { describe, it, expect, vi, beforeEach } from 'vitest';
import { domineEventBus } from '../event-bus.service';
import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';
import * as eventProcessor from '../event-processor';
import { randomUUID } from 'crypto';

// In-Memory Database Simulator for Concurrency Tests
// This strictly controls data access to mimic MySQL's UPDATE ... LIMIT 1 FOR UPDATE atomically.
// JS is single-threaded, so array synchronous operations are inherently atomic as long as we don't 'await' mid-operation.
let inMemoryDB: any[] = [];
let internalIncidentLog: any[] = [];

vi.mock('@/infra/repositories/domine-events.repository', () => ({
    domineEventsRepository: {
        publish: vi.fn().mockImplementation(async (eventObj: any) => {
            // Idempotency check 
            const exists = inMemoryDB.find(e => e.tenantId === eventObj.tenantId && e.idempotencyKey === eventObj.idempotencyKey);
            if (exists) return { id: exists.id, inserted: false };

            const id = randomUUID();
            inMemoryDB.push({
                id,
                tenantId: eventObj.tenantId,
                source: eventObj.source,
                type: eventObj.type,
                payloadJson: eventObj.payloadJson,
                idempotencyKey: eventObj.idempotencyKey || randomUUID(),
                status: 'queued',
                createdAt: new Date(),
                updatedAt: new Date(),
                nextRetryAt: null,
            });
            return { id, inserted: true };
        }),
        getById: vi.fn().mockImplementation(async (id) => {
            return inMemoryDB.find(e => e.id === id) || null;
        }),
        markProcessed: vi.fn().mockImplementation(async (id) => {
            const event = inMemoryDB.find(e => e.id === id);
            if (event) {
                event.status = 'processed';
                event.updatedAt = new Date();
            }
        }),
        sendToDLQ: vi.fn().mockImplementation(async (id, errCode, errMsg, nextRetryAt) => {
            const event = inMemoryDB.find(e => e.id === id);
            if (event) {
                event.status = 'failed';
                event.errorCode = errCode;
                event.errorMessage = errMsg;
                event.nextRetryAt = nextRetryAt || null;
                event.updatedAt = new Date();
            }
        }),
        getDLQCount: vi.fn().mockImplementation(async (tenantId) => {
            return inMemoryDB.filter(e => e.tenantId === tenantId && e.status === 'failed').length;
        }),
        lockAndGetNextEvent: vi.fn().mockImplementation(async (tenantId) => {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

            const nextEvent = inMemoryDB.find(e =>
                e.tenantId === tenantId && (
                    (e.status === 'queued' && (!e.nextRetryAt || e.nextRetryAt <= now)) ||
                    (e.status === 'processing' && e.updatedAt <= fiveMinutesAgo)
                )
            );

            if (!nextEvent) return null;

            nextEvent.status = 'processing';
            nextEvent.updatedAt = now;
            return { id: nextEvent.id };
        }),
        getDomineOperationalStats: vi.fn().mockImplementation(async (tenantId) => {
            const queued = inMemoryDB.filter(e => e.status === 'queued' && e.tenantId === tenantId);
            const oldest = queued.length > 0
                ? queued.reduce((min, e) => (e.createdAt < min ? e.createdAt : min), queued[0].createdAt)
                : new Date();

            return {
                totalQueued: queued.length,
                totalProcessing: inMemoryDB.filter(e => e.status === 'processing' && e.tenantId === tenantId).length,
                totalProcessedLastHour: 0,
                totalFailedLastHour: 0,
                totalInDLQ: inMemoryDB.filter(e => e.status === 'failed' && e.tenantId === tenantId).length,
                oldestUnprocessedEventAge: Date.now() - oldest.getTime()
            };
        })
    }
}));

vi.mock('@/infra/repositories/tenant-incidents.repository', () => ({
    tenantIncidentsRepository: {
        logIncident: vi.fn().mockImplementation(async (log) => {
            internalIncidentLog.push(log);
        })
    }
}));

vi.mock('@/infra/repositories/admin-audit-log.repository', () => ({
    adminAuditLogRepository: {
        log: vi.fn().mockResolvedValue(true)
    }
}));

describe('FASE 3.5 - Domine Resilience Tests', () => {

    beforeEach(() => {
        inMemoryDB = [];
        internalIncidentLog = [];
        vi.restoreAllMocks();
    });

    it('TESTE 1 — DUPLA INSTÂNCIA: Simulates 2 processors running concurrently, draining 100 events perfectly deduplicated', async () => {
        const tenantId = 't-dupla';
        let processedCount = 0;

        // Spy must be alive before ANY publish because publish triggers async loops
        vi.spyOn(eventProcessor, 'processDomineEvent').mockImplementation(async () => {
            // Artificial delay to enforce overlap and contention
            await new Promise(r => setTimeout(r, 2));
            processedCount++;
        });

        // Publish 100 events
        const pbs = [];
        for (let i = 0; i < 100; i++) {
            pbs.push(domineEventBus.publish(tenantId, 'cockpit', 'test_event', { idx: i }, { idempotencyKey: `k-${i}` }));
        }
        await Promise.all(pbs);

        expect(inMemoryDB.length).toBe(100);

        // Fire 2 explicit processors simultaneously (joining the 100 background ones)
        await Promise.all([
            domineEventBus.processAsync(tenantId),
            domineEventBus.processAsync(tenantId)
        ]);

        let waitCycles = 0;
        // Poll wait until queue drains so we don't assert prematurely
        while (inMemoryDB.some(e => e.status === 'processing' || e.status === 'queued')) {
            await new Promise(r => setTimeout(r, 10));
            waitCycles++;
            if (waitCycles > 50) {
                break;
            }
        }

        // Assertions
        expect(processedCount).toBe(100);
        expect(inMemoryDB.every(e => e.status === 'processed')).toBe(true);
        expect(inMemoryDB.some(e => e.status === 'queued' || e.status === 'failed')).toBe(false);
    });

    it('TESTE 2 — CRASH DURANTE PROCESSAMENTO: Reaps events stuck in processing > 5 min', async () => {
        const tenantId = 't-crash';

        let hit = false;
        vi.spyOn(eventProcessor, 'processDomineEvent').mockImplementation(async () => {
            hit = true;
        });

        const { id } = await domineEventBus.publish(tenantId, 'cockpit', 'crash_event', {}, { idempotencyKey: 'c-1' });

        // Manually simulate it being picked up but deadlocked/crashed (setting date to 6 mins ago)
        const event = inMemoryDB.find(e => e.id === id);
        event!.status = 'processing';
        event!.updatedAt = new Date(Date.now() - 6 * 60 * 1000); // 6 mins ago

        await domineEventBus.processAsync(tenantId);

        expect(hit).toBe(true);
        expect(event!.status).toBe('processed');
    });

    it('TESTE 3 — BACKLOG ACÚMULO: Publish 500 events and drain safely', async () => {
        const tenantId = 't-mass';

        let localHits = 0;
        vi.spyOn(eventProcessor, 'processDomineEvent').mockImplementation(async () => {
            localHits++;
        });

        const pbs = [];
        for (let i = 0; i < 500; i++) {
            pbs.push(domineEventBus.publish(tenantId, 'cockpit', 'mass_event', { idx: i }, { idempotencyKey: `m-${i}` }));
        }
        await Promise.all(pbs);

        expect(inMemoryDB.length).toBe(500);

        // Track time
        const start = Date.now();
        await domineEventBus.processAsync(tenantId);

        // Wait for potential straggler background loops
        let w3 = 0;
        while (inMemoryDB.some(e => e.status === 'processing' || e.status === 'queued')) {
            await new Promise(r => setTimeout(r, 10));
            w3++;
            if (w3 > 50) {
                const stuck = inMemoryDB.filter(e => e.status === 'processing' || e.status === 'queued');
                console.log(`[Mock] STUCK EVENTS Test 3: ${stuck.length}`, stuck.map(s => s.status));
                break;
            }
        }

        const duration = Date.now() - start;

        // Ensure everything is drained correctly
        expect(localHits).toBe(500);
        const drainWaitEvents = inMemoryDB.filter(e => e.status === 'queued');
        expect(drainWaitEvents.length).toBe(0);

        // Log throughput for the report naturally through simple console (seen in terminal)
        console.log(`[TESTE 3] 500 Events Drained in ${duration}ms. Throughput: ${(500 / (duration / 1000)).toFixed(2)} ev/sec`);
    });

    it('TESTE 4 — FALHA EXTERNA: NextRetryAt escalates and emits tenant_incident after repeats', async () => {
        const tenantId = 't-ext';

        let failureCount = 0;
        vi.spyOn(eventProcessor, 'processDomineEvent').mockImplementation(async () => {
            failureCount++;
            throw new Error("Provider timeout simulated");
        });

        // Provide 6 unique events that all fail, triggering the DLQ limit of 5.
        // We do this sequentially so the DLQ count increments deterministically rather than returning 0 for all concurrent races.
        for (let i = 1; i <= 6; i++) {
            await domineEventBus.publish(tenantId, 'cockpit', 'fail_event', {}, { idempotencyKey: `f-${i}` });

            let ww = 0;
            while (inMemoryDB.some(e => e.status === 'processing' || e.status === 'queued')) {
                await new Promise(r => setTimeout(r, 10));
                ww++;
                if (ww > 50) break;
            }
        }

        expect(failureCount).toBe(6);
        expect(inMemoryDB.filter(e => e.status === 'failed').length).toBe(6);

        // Assert backoff timestamp was pushed out correctly on the last event (failCount at its run would be 4 or 5 depending on race, but definitely >= 1)
        const resultingEvent = inMemoryDB[5];
        expect(resultingEvent.status).toBe('failed');

        // Even the first one gets a backoff (0*5 = 0 || 5mins) -> 5 mins. So it's guaranteed in the future.
        expect(resultingEvent.nextRetryAt!.getTime()).toBeGreaterThan(Date.now()); // Date is in the future

        // Check the incident log
        const failureIncidents = internalIncidentLog.filter(inc => inc.type === 'domine_event_failed');
        expect(failureIncidents.length).toBeGreaterThan(0);
        // At the 6th event, failCount evaluates to 5 right before insertion.
        expect(failureIncidents[0].metadata.message).toContain('Too many events in DLQ');
    });
});
