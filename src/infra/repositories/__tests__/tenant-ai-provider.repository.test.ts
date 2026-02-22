import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantAIProviderRepository } from '../tenant-ai-provider.repository';

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock('../../db', () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

describe('TenantAIProviderRepository', () => {
  let repository: TenantAIProviderRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new TenantAIProviderRepository();
    process.env.DEFAULT_AI_TIMEOUT_MS = '20000';
  });

  it('throws when tenantId is missing on getProviderConfig', async () => {
    await expect(repository.getProviderConfig('')).rejects.toThrow('tenantId is required');
  });

  it('returns null when no config is found', async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    const result = await repository.getProviderConfig('tenant-1');
    expect(result).toBeNull();
  });

  it('inserts a new config when none exists', async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    mockDb.values.mockResolvedValueOnce(undefined);

    await repository.upsertProviderConfig('tenant-2', {
      providerType: 'shared',
      baseUrl: 'http://localhost:1234',
      model: 'model',
      embedModel: 'embed',
    });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalled();
  });

  it('updates config when one already exists', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 'existing' }]);
    mockDb.where.mockResolvedValueOnce(undefined);

    await repository.upsertProviderConfig('tenant-3', {
      providerType: 'dedicated',
      baseUrl: 'http://localhost:5678',
      model: 'model-x',
      embedModel: 'embed-x',
      timeoutMs: 30000,
    });

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: 'dedicated',
        timeoutMs: 30000,
      })
    );
  });
});
