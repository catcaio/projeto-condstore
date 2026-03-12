import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.hoisted(() => vi.fn());
const mockFindById = vi.hoisted(() => vi.fn());
const mockUpdateStatus = vi.hoisted(() => vi.fn());
const mockListCaptured = vi.hoisted(() => vi.fn());

vi.mock('../intent.repository', () => ({
    intentRepository: {
        create: mockCreate,
        findById: mockFindById,
        updateStatus: mockUpdateStatus,
        listCaptured: mockListCaptured,
    }
}));

import { intentTrainingService } from '../intent.service';

describe('IntentTrainingService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('captureIntent should create and emit event', async () => {
        mockCreate.mockResolvedValue('intent-1');

        const id = await intentTrainingService.captureIntent('tenant-1', 'sess-1', {
            conversationId: 'conv-1',
            messageId: 'msg-1',
            messageText: 'Quanto custa para entregar em SP?',
            detectedIntent: 'FRETE',
            confidence: 0.85,
        });

        expect(id).toBe('intent-1');
        expect(mockCreate).toHaveBeenCalled();
    });

    it('validateIntent should update status and emit validated event', async () => {
        mockFindById.mockResolvedValue({
            id: 'intent-1',
            messageText: 'Original',
        });
        mockUpdateStatus.mockResolvedValue(true);

        const ok = await intentTrainingService.validateIntent('tenant-1', 'intent-1', 'op-1');

        expect(ok).toBe(true);
        expect(mockUpdateStatus).toHaveBeenCalledWith('tenant-1', 'intent-1', 'validated');
    });

    it('ignoreIntent should update status to ignored', async () => {
        mockFindById.mockResolvedValue({
            id: 'intent-2',
        });
        mockUpdateStatus.mockResolvedValue(true);

        const ok = await intentTrainingService.ignoreIntent('tenant-1', 'intent-2', 'op-1');

        expect(ok).toBe(true);
        expect(mockUpdateStatus).toHaveBeenCalledWith('tenant-1', 'intent-2', 'ignored');
    });
});
