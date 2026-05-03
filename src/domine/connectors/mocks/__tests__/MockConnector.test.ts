import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockConnector } from '../MockConnector';
import { logger } from '../../../../infra/logger';

vi.mock('../../../../infra/logger', () => ({
    logger: {
        info: vi.fn(),
    },
}));

describe('MockConnector', () => {
    let connector: MockConnector;

    beforeEach(() => {
        connector = new MockConnector();
        vi.clearAllMocks();
    });

    it('should initialize and log without sensitive data', async () => {
        const context = {
            tenantId: 'sensitive-tenant-id',
            idempotencyKey: 'sensitive-key',
            source: 'test-source',
            occurredAt: '2023-01-01T00:00:00Z',
        };

        await connector.initialize(context);

        expect(logger.info).toHaveBeenCalledWith('[MockConnector] Initialized', {
            source: 'test-source',
        });

        // Ensure tenantId and idempotencyKey are NOT logged
        const callArgs = (logger.info as any).mock.calls[0][1];
        expect(callArgs).not.toHaveProperty('tenantId');
        expect(callArgs).not.toHaveProperty('idempotencyKey');
    });

    it('should sync and log without sensitive data', async () => {
        const context = {
            tenantId: 'sensitive-tenant-id',
            idempotencyKey: 'sensitive-key',
            source: 'test-source',
            occurredAt: '2023-01-01T00:00:00Z',
        };

        await connector.sync(context);

        expect(logger.info).toHaveBeenCalledWith('[MockConnector] Sync triggered', {
            source: 'test-source',
            occurredAt: '2023-01-01T00:00:00Z',
        });

        // Ensure tenantId and idempotencyKey are NOT logged
        const callArgs = (logger.info as any).mock.calls[0][1];
        expect(callArgs).not.toHaveProperty('tenantId');
        expect(callArgs).not.toHaveProperty('idempotencyKey');
    });
});
