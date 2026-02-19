
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetricsRepository } from '../metrics.repository';
import { ErrorCode } from '../../../infra/errors';

// Mock infra/logger
vi.mock('../../../infra/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock DB dependency
const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
};

// Mock mysql/drizzle (partial)
vi.mock('mysql2/promise', () => ({
    default: {
        createPool: vi.fn(() => ({
            getConnection: vi.fn().mockResolvedValue({ release: vi.fn() }),
        })),
    },
}));

vi.mock('drizzle-orm/mysql2', () => ({
    drizzle: vi.fn(() => mockDb),
}));

describe('MetricsRepository', () => {
    let repository: MetricsRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repository = new MetricsRepository();
        process.env.DATABASE_URL = 'mysql://mock:3306/db';
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    it('should throw error if tenantId is missing on saveFreightQuoted', async () => {
        const record = { id: '123' } as any;
        await expect(repository.saveFreightQuoted(record)).rejects.toThrow('tenant_id is required');
    });

    it('should save freight quote successfully', async () => {
        const record = { id: '123', tenantId: 'tenant-1' } as any;
        await repository.saveFreightQuoted(record);
        expect(mockDb.insert).toHaveBeenCalled();
        expect(mockDb.values).toHaveBeenCalledWith(record);
    });

    it('should throw error if tenantId is missing on getFreightMetrics', async () => {
        await expect(repository.getFreightMetrics('')).rejects.toThrow('tenant_id required');
    });
});
