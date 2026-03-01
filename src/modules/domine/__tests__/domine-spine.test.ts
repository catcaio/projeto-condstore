import { describe, it, expect, vi, beforeEach } from 'vitest';
import { domineEventBus } from '../event-bus.service';
import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';
import { domineReadRepository } from '@/infra/repositories/domine-read.repository';

// Mock specific repositories to avoid real DB dependency for unit test scope
vi.mock('@/infra/repositories/domine-events.repository', () => ({
    domineEventsRepository: {
        publish: vi.fn(),
        getById: vi.fn(),
        markProcessed: vi.fn(),
        sendToDLQ: vi.fn(),
        listEvents: vi.fn(),
        getDLQCount: vi.fn(),
        lockAndGetNextEvent: vi.fn(),
        getDomineOperationalStats: vi.fn().mockResolvedValue({ oldestUnprocessedEventAge: 0 })
    }
}));

vi.mock('@/infra/repositories/domine-read.repository', () => ({
    domineReadRepository: {
        upsertOrder: vi.fn(),
        upsertFreightQuote: vi.fn(),
        getOrder: vi.fn(),
        listOrders: vi.fn()
    }
}));

vi.mock('@/infra/repositories/admin-audit-log.repository', () => ({
    adminAuditLogRepository: { log: vi.fn() }
}));

vi.mock('@/infra/repositories/tenant-incidents.repository', () => ({
    tenantIncidentsRepository: { logIncident: vi.fn() }
}));

describe('Domine Minimal Event Spine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should respect idempotency and avoid duplicates on publish', async () => {
        // First call behaves like an insert
        vi.mocked(domineEventsRepository.publish).mockResolvedValueOnce({ id: 'event-1', inserted: true });

        const r1 = await domineEventBus.publish('tenant-test', 'cockpit', 'order_created', {}, { idempotencyKey: 'idem-1' });
        expect(r1.inserted).toBe(true);

        // Second call simulates DB idempotency hit
        vi.mocked(domineEventsRepository.publish).mockResolvedValueOnce({ id: 'event-1', inserted: false });

        const r2 = await domineEventBus.publish('tenant-test', 'cockpit', 'order_created', {}, { idempotencyKey: 'idem-1' });
        expect(r2.inserted).toBe(false);
        expect(r2.id).toBe(r1.id);
    });

    it('should correctly process order events and update the read model', async () => {
        // Event data
        const eventId = 'evt-abc';
        const mockEvent = {
            id: eventId,
            tenantId: 'tenant-123',
            source: 'connector',
            type: 'order_paid',
            idempotencyKey: 'test-1',
            status: 'queued',
            payloadJson: {
                orderId: 'ORD-001',
                totals: { value: 100 }
            }
        };

        vi.mocked(domineEventsRepository.lockAndGetNextEvent).mockResolvedValueOnce({ id: eventId }).mockResolvedValueOnce(null);
        vi.mocked(domineEventsRepository.getById).mockResolvedValueOnce(mockEvent as any);

        await domineEventBus.processAsync('tenant-123');

        // Check if read model was updated
        expect(domineReadRepository.upsertOrder).toHaveBeenCalledWith(
            'tenant-123',
            'ORD-001',
            'order_paid',
            { value: 100 }
        );

        // Check if event was marked as processed
        expect(domineEventsRepository.markProcessed).toHaveBeenCalledWith(eventId);
    });

    it('should correctly capture DLQ when read model logic fails', async () => {
        const eventId = 'evt-abc';
        const mockEvent = {
            id: eventId,
            tenantId: 'tenant-123',
            source: 'connector',
            type: 'order_paid',
            idempotencyKey: 'test-1',
            status: 'queued',
            // Missing orderId will throw error in processor
            payloadJson: {}
        };

        vi.mocked(domineEventsRepository.lockAndGetNextEvent).mockResolvedValueOnce({ id: eventId }).mockResolvedValueOnce(null);
        vi.mocked(domineEventsRepository.getById).mockResolvedValueOnce(mockEvent as any);
        // Pretend this is the first failure
        vi.mocked(domineEventsRepository.getDLQCount).mockResolvedValueOnce(0);

        await domineEventBus.processAsync('tenant-123');

        expect(domineReadRepository.upsertOrder).not.toHaveBeenCalled();
        expect(domineEventsRepository.sendToDLQ).toHaveBeenCalledWith(
            eventId,
            'PROC_ERR',
            'orderId missing from payload constraints',
            expect.any(Date) // Should calculate nextRetryAt
        );
    });
});
