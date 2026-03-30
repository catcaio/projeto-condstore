import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dbInfra from '@/infra/db';
import { conversationRepository } from '../conversation.repository';

vi.mock('@/infra/db', () => ({
    getDb: vi.fn(),
}));

describe('conversationRepository.updateConversationStage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('applies compare-and-swap update and increments version when row matches', async () => {
        const whereMock = vi.fn().mockResolvedValue({ affectedRows: 1 });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        const updateMock = vi.fn().mockReturnValue({ set: setMock });

        vi.mocked(dbInfra.getDb).mockResolvedValue({
            update: updateMock,
        } as any);

        const updated = await conversationRepository.updateConversationStage(
            'tenant-1',
            'conv-1',
            2,
            'WON'
        );

        expect(updated).toBe(true);
        expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
            stage: 'WON',
            version: expect.anything(),
        }));
        expect(whereMock).toHaveBeenCalledTimes(1);
    });

    it('returns false when compare-and-swap does not affect rows', async () => {
        const whereMock = vi.fn().mockResolvedValue({ affectedRows: 0 });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        const updateMock = vi.fn().mockReturnValue({ set: setMock });

        vi.mocked(dbInfra.getDb).mockResolvedValue({
            update: updateMock,
        } as any);

        const updated = await conversationRepository.updateConversationStage(
            'tenant-1',
            'conv-1',
            2,
            'LOST',
            'Price too high'
        );

        expect(updated).toBe(false);
        expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
            stage: 'LOST',
            lostReason: 'Price too high',
            version: expect.anything(),
        }));
    });
});

describe('conversationRepository.findOrCreateConversationByPhone', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each(['sent', 'delivered'])('reuses an existing conversation in %s status for the same phone', async (status) => {
        const existingConversation = {
            id: 'conv-1',
            tenantId: 'tenant-1',
            phoneHash: 'hash-1',
            phoneEncrypted: 'enc-1',
            status,
        };

        const limitMock = vi.fn().mockResolvedValueOnce([existingConversation]);
        const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
        const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
        const fromMock = vi.fn().mockReturnValue({ where: whereMock });
        const selectMock = vi.fn().mockReturnValue({ from: fromMock });
        const insertMock = vi.fn();

        vi.mocked(dbInfra.getDb).mockResolvedValue({
            select: selectMock,
            insert: insertMock,
        } as any);

        const result = await conversationRepository.findOrCreateConversationByPhone(
            'tenant-1',
            'hash-1',
            'enc-1'
        );

        expect(result).toEqual(existingConversation);
        expect(insertMock).not.toHaveBeenCalled();
    });
});
