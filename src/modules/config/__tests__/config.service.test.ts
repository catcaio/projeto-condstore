import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '../config.service';
import { configRepository } from '../config.repository';

vi.mock('../config.repository', () => ({
    configRepository: {
        get: vi.fn(),
        list: vi.fn(),
        upsert: vi.fn(),
        remove: vi.fn(),
    }
}));

vi.mock('../config.events', () => ({
    emitConfigCreated: vi.fn(),
    emitConfigUpdated: vi.fn(),
    emitConfigDeleted: vi.fn(),
}));

describe('ConfigService', () => {
    let service: ConfigService;

    beforeEach(() => {
        service = new ConfigService();
        vi.clearAllMocks();
    });

    it('should return default value if config not found', async () => {
        vi.mocked(configRepository.get).mockResolvedValueOnce(null);
        
        const res = await service.getConfigValue('tenant-1', 'key1', 'default-val');
        expect(res).toBe('default-val');
    });

    it('should throw if config not found and no default provided', async () => {
        vi.mocked(configRepository.get).mockResolvedValueOnce(null);
        await expect(service.getConfigValue('tenant-1', 'key1')).rejects.toThrow('Configuration not found');
    });

    it('should return config value when found', async () => {
        vi.mocked(configRepository.get).mockResolvedValueOnce({
            id: 'x', key: 'key1', value: 'my-val', category: 'pipeline', createdAt: new Date(), updatedAt: new Date(), createdBy: 'u'
        });
        
        const res = await service.getConfigValue('tenant-1', 'key1');
        expect(res).toBe('my-val');
    });
});
