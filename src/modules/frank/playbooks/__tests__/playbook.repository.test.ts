import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createPlaybook,
    updatePlaybook,
    getPlaybookById,
    listPlaybooks,
    findApprovedPlaybooksForIntent,
    archivePlaybook
} from '../playbook.repository';
import { randomUUID } from 'crypto';

// ── DB mock (Drizzle chained query) ───────────────────────────────────────────
const mockDbLimit = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockDbWhere = vi.hoisted(() => vi.fn().mockReturnThis());
const mockDbOrderBy = vi.hoisted(() => vi.fn().mockReturnThis());
const mockDbSet = vi.hoisted(() => vi.fn().mockReturnThis());
const mockDbValues = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const selectChain = vi.hoisted(() => ({
    from: vi.fn().mockReturnThis(),
    where: mockDbWhere,
    orderBy: mockDbOrderBy,
    limit: mockDbLimit,
    then: (resolve: any, reject: any) => mockDbLimit().then(resolve).catch(reject),
}));

const updateChain = vi.hoisted(() => ({
    set: mockDbSet,
    where: mockDbWhere,
    then: (resolve: any, reject: any) => mockDbWhere().then(resolve).catch(reject),
}));

const insertChain = vi.hoisted(() => ({
    values: mockDbValues,
    then: (resolve: any, reject: any) => mockDbValues().then(resolve).catch(reject),
}));

const mockDb = vi.hoisted(() => ({
    insert: vi.fn().mockReturnValue(insertChain),
    update: vi.fn().mockReturnValue(updateChain),
    select: vi.fn().mockReturnValue(selectChain),
}));

vi.mock('@/infra/db', () => ({
    getDb: vi.fn().mockResolvedValue(mockDb),
}));

const TEST_TENANT_ID = randomUUID();

describe('Frank Playbook Repository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDbLimit.mockResolvedValue([]);
        mockDbValues.mockResolvedValue(undefined);
    });

    it('should create and retrieve a playbook by ID', async () => {
        const id = await createPlaybook({
            tenantId: TEST_TENANT_ID,
            title: 'Test FAQ',
            intent: 'OUTRO',
            responseBase: 'Resposta Base',
            priority: 10,
        });

        expect(id).toBeDefined();
        expect(mockDb.insert).toHaveBeenCalledTimes(1);

        mockDbLimit.mockResolvedValueOnce([{ id, title: 'Test FAQ' }]);
        const pb = await getPlaybookById(TEST_TENANT_ID, id);
        expect(pb?.title).toBe('Test FAQ');
        expect(mockDb.select).toHaveBeenCalledTimes(1);
        expect(mockDbLimit).toHaveBeenCalledWith(1);
    });

    it('should update a playbook', async () => {
        const id = randomUUID();
        mockDbWhere.mockResolvedValueOnce(undefined);

        await updatePlaybook({
            id,
            tenantId: TEST_TENANT_ID,
            title: 'Updated FAQ',
            status: 'approved',
            requiresHumanHandoff: true,
        });

        expect(mockDb.update).toHaveBeenCalledTimes(1);
        expect(mockDbSet).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Updated FAQ',
            status: 'approved',
            requiresHumanHandoff: true
        }));
    });

    it('should archive a playbook', async () => {
        const id = randomUUID();
        mockDbWhere.mockResolvedValueOnce(undefined);

        await archivePlaybook(TEST_TENANT_ID, id);

        expect(mockDb.update).toHaveBeenCalledTimes(1);
        expect(mockDbSet).toHaveBeenCalledWith({ status: 'archived' });
    });

    it('should find only approved playbooks for an intent ordered by priority', async () => {
        mockDbOrderBy.mockResolvedValueOnce([{ id: '1', title: 'High Prio' }]);

        const list = await findApprovedPlaybooksForIntent(TEST_TENANT_ID, 'OUTRO');
        expect(mockDb.select).toHaveBeenCalledTimes(1);
        expect(mockDbOrderBy).toHaveBeenCalledTimes(1);
        // Returns whatever mock returns because the promise unwraps orderBy
        expect(list).toEqual([{ id: '1', title: 'High Prio' }]);
    });

    it('should list all playbooks for a tenant', async () => {
        mockDbOrderBy.mockResolvedValueOnce([{ id: '1' }, { id: '2' }]);

        const list = await listPlaybooks(TEST_TENANT_ID);
        expect(mockDb.select).toHaveBeenCalledTimes(1);
        expect(mockDbOrderBy).toHaveBeenCalledTimes(1);
        expect(list).toHaveLength(2);
    });
});
