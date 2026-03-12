import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRepo = vi.hoisted(() => ({
    create: vi.fn(),
    getById: vi.fn(),
    listByEntity: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setValues: vi.fn(),
    getValues: vi.fn(),
}));

vi.mock('../custom-fields.repository', () => ({
    get customFieldsRepository() { return mockRepo; },
    CustomFieldsRepository: vi.fn()
}));

import { CustomFieldsService } from '../custom-fields.service';

vi.mock('../custom-fields.events', () => ({
    emitCustomFieldCreated: vi.fn(),
    emitCustomFieldUpdated: vi.fn(),
    emitCustomFieldDeleted: vi.fn(),
    emitCustomFieldValueSet: vi.fn(),
}));

describe('CustomFieldsService', () => {
    let service: CustomFieldsService;

    beforeEach(() => {
        service = new CustomFieldsService(mockRepo as any);
        vi.clearAllMocks();
    });

    it('should create field if key is unique', async () => {
        mockRepo.listByEntity.mockResolvedValueOnce([]);
        mockRepo.create.mockResolvedValueOnce({ id: '1', fieldKey: 'doc', entity: 'customer' });

        const res = await service.createField('tenant-1', {
            entity: 'customer',
            fieldKey: 'doc',
            label: 'Documento',
            type: 'text',
            required: false
        });

        expect(res.id).toBe('1');
        expect(mockRepo.create).toHaveBeenCalled();
    });

    it('should throw when creating duplicate field key', async () => {
        mockRepo.listByEntity.mockResolvedValueOnce([{ fieldKey: 'doc' }]);
        
        await expect(service.createField('tenant-1', {
            entity: 'customer',
            fieldKey: 'doc',
            label: 'Doc',
            type: 'text',
            required: false
        })).rejects.toThrow(/already exists/);
    });
});
