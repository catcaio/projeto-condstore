import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationRepository } from '../simulation.repository';
import { redisClient } from '../../redis.client';

const mockDb = vi.hoisted(() => ({
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../db', () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

vi.mock('../../redis.client', () => ({
  redisClient: {
    isAvailable: vi.fn().mockReturnValue(false),
    del: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('SimulationRepository.saveSimulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.values.mockResolvedValue(undefined);
  });

  it('invalidates cockpit metrics cache after successful insert', async () => {
    vi.mocked(redisClient.isAvailable).mockReturnValue(true);
    const repository = new SimulationRepository();

    await repository.saveSimulation({
      id: 'sim-1',
      tenantId: 'tenant-1',
      cep: '01310930',
      weight: '1.25',
      quantity: 1,
    });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(redisClient.del).toHaveBeenCalledWith('cockpit:metrics:tenant-1');
  });
});
