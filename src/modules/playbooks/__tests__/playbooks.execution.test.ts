import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEmitExecuted = vi.hoisted(() => vi.fn());

vi.mock('../playbooks.events', () => ({
    emitPlaybookExecuted: mockEmitExecuted
}));

import { playbooksService } from '../playbooks.service';

describe('Playbooks Execution', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should record execution and emit event correctly', async () => {
        await playbooksService.recordExecution('tenant-1', 'pb-1', 'order-X', 'ctx-123', 'op-456');

        expect(mockEmitExecuted).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            playbookId: 'pb-1',
            entityId: 'order-X',
            contextId: 'ctx-123',
            operatorId: 'op-456'
        });
    });
});
