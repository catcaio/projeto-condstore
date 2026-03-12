import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.hoisted(() => vi.fn());
const mockFindById = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock('../playbooks.repository', () => ({
    get playbooksRepository() {
        return {
            create: mockCreate,
            findById: mockFindById,
            update: mockUpdate,
            delete: mockDelete,
        };
    }
}));

import { playbooksService } from '../playbooks.service';

describe('PlaybooksService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a playbook and emit event', async () => {
        mockCreate.mockResolvedValue({ id: 'pb-1', name: 'Test', tenantId: 'tenant-1' });

        const result = await playbooksService.createPlaybook('tenant-1', {
            name: 'Test',
            entity: 'conversation',
            isActive: true,
            steps: []
        });

        expect(result.id).toBe('pb-1');
        expect(mockCreate).toHaveBeenCalled();
    });

    it('should update a playbook and emit event', async () => {
        mockFindById.mockResolvedValue({ id: 'pb-1', name: 'Test', tenantId: 'tenant-1', version: 1 });
        mockUpdate.mockResolvedValue({ id: 'pb-1', name: 'Updated', tenantId: 'tenant-1', version: 2 });

        const result = await playbooksService.updatePlaybook('tenant-1', 'pb-1', { name: 'Updated' });

        expect(result.name).toBe('Updated');
        expect(mockUpdate).toHaveBeenCalledWith('tenant-1', 'pb-1', { name: 'Updated' }, 1);
    });

    it('should throw if playbook to update does not exist', async () => {
        mockFindById.mockResolvedValue(null);

        await expect(
            playbooksService.updatePlaybook('tenant-1', 'pb-missing', { name: 'Updated' })
        ).rejects.toThrow('Playbook not found: pb-missing');
    });
});
