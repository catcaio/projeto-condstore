import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FreightSimulationLogRepository } from '../freight-simulation-log.repository';
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
    error: vi.fn(),
  },
}));

vi.mock('../../redis.client', () => ({
  redisClient: {
    isAvailable: vi.fn().mockReturnValue(false),
    del: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('FreightSimulationLogRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists hashed CEP and normalized values', async () => {
    vi.mocked(redisClient.isAvailable).mockReturnValue(true);
    const repository = new FreightSimulationLogRepository();

    await repository.saveMetric({
      tenantId: 'tenant-1',
      destinationCep: '01310930',
      totalWeight: 2.5,
      bestPrice: 18.9,
      bestDeliveryTime: 4,
      uf: 'sp',
    });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      uf: 'SP',
      peso: '2.50',
      valor: '18.90',
      prazo: 4,
      cepHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(redisClient.del).toHaveBeenCalledWith('cockpit:metrics:freight:tenant-1');
  });
});
