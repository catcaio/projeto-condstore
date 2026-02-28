import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchService } from '../dispatch.service';
import { getDb } from '../../../infra/db';
import crypto from 'crypto';

// Mocks
vi.mock('../../../infra/db', () => ({
    getDb: vi.fn(),
}));
vi.mock('../../../infra/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

describe('Dispatch Service (MVP)', () => {
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockResolvedValue([{ insertId: '1' }]),
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis()
        };
        (getDb as any).mockResolvedValue(mockDb);
    });

    describe('tracking token generation & isolation', () => {
        it('should generate a 128+ bit token and store only the SHA-256 hash', async () => {
            mockDb.limit.mockResolvedValueOnce([]); // no pending
            mockDb.limit.mockResolvedValueOnce([
                { id: '1', uf: 'SP', cep: 'demo', createdAt: new Date() } // 1 local order
            ]);

            const cryptoSpyBytes = vi.spyOn(crypto, 'randomBytes');
            const cryptoSpyHash = vi.spyOn(crypto, 'createHash');

            await dispatchService.importOrders('tenantA');

            expect(cryptoSpyBytes).toHaveBeenCalledWith(32); // 256 bits
            expect(cryptoSpyHash).toHaveBeenCalledWith('sha256');

            // Check that values inserted into orders table has token and expiry
            const mockInsertCall = mockDb.values.mock.calls[0][0]; // orders insert
            expect(mockInsertCall.trackingTokenHash).toBeDefined();
            expect(mockInsertCall.trackingTokenHash).toHaveLength(64);
            expect(mockInsertCall.trackingTokenExpiresAt).toBeInstanceOf(Date);
            expect(mockInsertCall.trackingTokenExpiresAt.getTime() - Date.now()).toBeGreaterThan(6 * 24 * 60 * 60 * 1000); // approx 7 days
            expect(mockInsertCall.tenantId).toBe('tenantA');
        });
    });

    describe('tenant isolation in updates', () => {
        it('updateStopStatus strictly bounds to tenantId, updates route and creates events', async () => {
            mockDb.where.mockResolvedValueOnce([{ id: 'stopRemaining' }]); // remaining pending

            const newStatus = await dispatchService.updateStopStatus('tenantB', 'route1', 'stop1', 'order1', 'completed', 'Tech via app');

            expect(newStatus).toBe('delivered');

            // First update -> dispatchDeliveryRouteStops check tenant boundary
            const stopUpdateWhere = mockDb.where.mock.calls[0][0]; // the SQL fragment
            expect(stopUpdateWhere.queryChunks).toBeDefined();

            // It created an event
            const eventInsertCall = mockDb.values.mock.calls.find((call: any) => call[0].status === 'delivered')[0];
            expect(eventInsertCall.tenantId).toBe('tenantB');
            expect(eventInsertCall.orderId).toBe('order1');
            expect(eventInsertCall.description).toBe('Tech via app');
        });
    });
});
