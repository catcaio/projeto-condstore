import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindIntentById = vi.hoisted(() => vi.fn());
const mockFindPlaybookById = vi.hoisted(() => vi.fn());
const mockCreatePlaybook = vi.hoisted(() => vi.fn());
const mockUpdateLinkStatus = vi.hoisted(() => vi.fn());

vi.mock('@/modules/frank/intents/intent.repository', () => ({
    intentRepository: {
        findById: mockFindIntentById,
    }
}));

vi.mock('@/modules/frank/playbooks/playbook.repository', () => ({
    getPlaybookById: mockFindPlaybookById,
    createPlaybook: mockCreatePlaybook,
}));

vi.mock('../intent-linker.repository', () => ({
    intentLinkerRepository: {
        updateLinkStatus: mockUpdateLinkStatus,
    }
}));

vi.mock('../intent-linker.events', () => ({
    emitIntentLinkedToPlaybook: vi.fn(),
    emitIntentConvertedToPlaybook: vi.fn(),
}));

import { intentLinkerService } from '../intent-linker.service';

describe('IntentLinkerService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('linkExistingPlaybook should link properly', async () => {
        mockFindIntentById.mockResolvedValue({ id: 'intent-1' });
        mockFindPlaybookById.mockResolvedValue({ id: 'playbook-1' });
        mockUpdateLinkStatus.mockResolvedValue(true);

        const ok = await intentLinkerService.linkExistingPlaybook('tenant-1', 'intent-1', 'playbook-1', 'op-1');

        expect(ok).toBe(true);
        expect(mockUpdateLinkStatus).toHaveBeenCalledWith('tenant-1', 'intent-1', 'playbook-1', 'linked');
    });

    it('createPlaybookFromIntent should correctly map and link', async () => {
        mockFindIntentById.mockResolvedValue({ 
            id: 'intent-1', 
            detectedIntent: 'test',
            messageText: 'Hello'
        });
        mockCreatePlaybook.mockResolvedValue('new-playbook-id');
        mockUpdateLinkStatus.mockResolvedValue(true);

        const newId = await intentLinkerService.createPlaybookFromIntent('tenant-1', 'intent-1', {
            name: 'New Pb',
            intent: 'test',
            responseBase: 'Hi',
            triggerPhrases: ['Hello'],
            relatedEntities: [],
            requiresConfirmation: false,
            requiresHumanHandoff: false,
            tags: [],
            priority: 0,
            status: 'draft'
        }, 'op-1');

        expect(newId).toBe('new-playbook-id');
        expect(mockCreatePlaybook).toHaveBeenCalledWith(expect.objectContaining({
            title: 'New Pb',
            intent: 'test',
            responseBase: 'Hi'
        }));
        expect(mockUpdateLinkStatus).toHaveBeenCalledWith('tenant-1', 'intent-1', 'new-playbook-id', 'converted_to_playbook');
    });

    it('should throw if intent not found', async () => {
        mockFindIntentById.mockResolvedValue(null);

        await expect(intentLinkerService.linkExistingPlaybook('t1', 'bad-id', 'pb1', 'op1')).rejects.toThrow('Intent not found');
    });
});
