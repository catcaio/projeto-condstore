import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dbInfra from '@/infra/db';
import { crmRepository } from '../crm.repository';

vi.mock('@/infra/db', async () => {
    const actual = await vi.importActual<typeof import('@/infra/db')>('@/infra/db');
    return {
        ...actual,
        getDb: vi.fn(),
    };
});

describe('crmRepository soft delete behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('soft deletes notes via update deletedAt', async () => {
        const where = vi.fn().mockResolvedValue(undefined);
        const set = vi.fn().mockReturnValue({ where });
        const mockDb = {
            update: vi.fn().mockReturnValue({ set }),
        };

        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        await crmRepository.softDeleteNote('tenant-1', 'note-1');

        expect(mockDb.update).toHaveBeenCalled();
        expect(set).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: expect.any(Date) }));
        expect(where).toHaveBeenCalled();
    });

    it('replaces quote items by soft deleting existing rows before insert', async () => {
        const selectWhere = vi.fn().mockResolvedValue([{ id: 'item-1' }]);
        const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
        const select = vi.fn().mockReturnValue({ from: selectFrom });

        const updateWhere = vi.fn().mockResolvedValue(undefined);
        const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
        const update = vi.fn().mockReturnValue({ set: updateSet });

        const insertValues = vi.fn().mockResolvedValue(undefined);
        const insert = vi.fn().mockReturnValue({ values: insertValues });

        const mockDb = { select, update, insert };
        vi.mocked(dbInfra.getDb).mockResolvedValue(mockDb as any);

        const items = [{
            id: 'item-2',
            tenantId: 'tenant-1',
            quoteId: 'quote-1',
            description: 'Produto',
            quantity: 1,
            unitPrice: '10.00',
            totalPrice: '10.00',
            createdAt: new Date(),
        }];

        await crmRepository.replaceQuoteItems('tenant-1', 'quote-1', items);

        expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: expect.any(Date) }));
        expect(insertValues).toHaveBeenCalledWith(items);
    });

    it('reuses the provided database executor instead of opening a new connection', async () => {
        const selectWhere = vi.fn().mockResolvedValue([]);
        const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
        const select = vi.fn().mockReturnValue({ from: selectFrom });
        const insertValues = vi.fn().mockResolvedValue(undefined);
        const insert = vi.fn().mockReturnValue({ values: insertValues });
        const mockDb = { select, insert };

        await crmRepository.replaceQuoteItems('tenant-1', 'quote-1', [], mockDb as any);

        expect(dbInfra.getDb).not.toHaveBeenCalled();
        expect(select).toHaveBeenCalled();
        expect(insert).not.toHaveBeenCalled();
    });
});
