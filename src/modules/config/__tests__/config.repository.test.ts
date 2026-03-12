import { describe, it, expect, vi } from 'vitest';
import { ConfigRepository } from '../config.repository';

// Abstracted DB mock for Drizzle
vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

describe('ConfigRepository', () => {
    it('is properly instantiable', () => {
        const repo = new ConfigRepository();
        expect(repo).toBeDefined();
    });
});
