import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.hoisted(() => vi.fn());
const mockFindById = vi.hoisted(() => vi.fn());
const mockUpdateStatus = vi.hoisted(() => vi.fn());
const mockListPending = vi.hoisted(() => vi.fn());

vi.mock('../suggestion.repository', () => ({
    suggestionRepository: {
        create: mockCreate,
        findById: mockFindById,
        updateStatus: mockUpdateStatus,
        listPending: mockListPending,
    }
}));

import { suggestionService } from '../suggestion.service';

describe('SuggestionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generateSuggestion should create and emit event', async () => {
        mockCreate.mockResolvedValue('sugg-1');

        const id = await suggestionService.generateSuggestion('tenant-1', 'sess-1', {
            conversationId: 'conv-1',
            intent: 'test',
            suggestedResponse: 'Hello',
            confidence: 0.9,
        });

        expect(id).toBe('sugg-1');
        expect(mockCreate).toHaveBeenCalled();
    });

    it('approveSuggestion should update status and emit approved event', async () => {
        mockFindById.mockResolvedValue({
            id: 'sugg-1',
            sessionId: 'sess-1',
            suggestedResponse: 'Original',
        });
        mockUpdateStatus.mockResolvedValue(true);

        const ok = await suggestionService.approveSuggestion('tenant-1', 'sugg-1', {
            operatorId: 'op-1',
            finalResponse: 'Original'
        });

        expect(ok).toBe(true);
        expect(mockUpdateStatus).toHaveBeenCalledWith('tenant-1', 'sugg-1', 'approved', 'op-1', 'Original');
    });

    it('approveSuggestion should update status and emit edited event', async () => {
        mockFindById.mockResolvedValue({
            id: 'sugg-2',
            sessionId: 'sess-1',
            suggestedResponse: 'Original',
        });
        mockUpdateStatus.mockResolvedValue(true);

        const ok = await suggestionService.approveSuggestion('tenant-1', 'sugg-2', {
            operatorId: 'op-1',
            finalResponse: 'Edited'
        });

        expect(ok).toBe(true);
        expect(mockUpdateStatus).toHaveBeenCalledWith('tenant-1', 'sugg-2', 'edited', 'op-1', 'Edited');
    });

    it('rejectSuggestion should update status to rejected', async () => {
        mockFindById.mockResolvedValue({
            id: 'sugg-3',
            sessionId: 'sess-1',
        });
        mockUpdateStatus.mockResolvedValue(true);

        const ok = await suggestionService.rejectSuggestion('tenant-1', 'sugg-3', 'op-1');

        expect(ok).toBe(true);
        expect(mockUpdateStatus).toHaveBeenCalledWith('tenant-1', 'sugg-3', 'rejected', 'op-1');
    });
});
