import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dbInfra from '@/infra/db';
import { PATCH as StagePatch } from '../stage/route';
import { PATCH as OwnerPatch } from '../owner/route';
import { POST as NotesPost, GET as NotesGet } from '../notes/route';
import { POST as TasksPost, GET as TasksGet } from '../tasks/route';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        session: { tenantId: 't1', user: { id: 'op1' } },
        response: null
    })
}));

vi.mock('@/modules/atendimento/conversation.repository', () => ({
    conversationRepository: {
        getConversationById: vi.fn().mockResolvedValue({ id: 'conv-1', customerId: 'cust-1', assignedTo: 'op1', stage: 'NEW_LEAD', version: 0 }),
        assignConversation: vi.fn().mockResolvedValue({}),
        unassignConversation: vi.fn().mockResolvedValue({}),
    }
}));

vi.mock('@/modules/atendimento/conversation.service', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/modules/atendimento/conversation.service')>();
    return {
        ...actual,
        conversationService: {
            ...actual.conversationService,
            changeConversationStage: vi.fn().mockResolvedValue({}),
        }
    };
});

const mockDbUpdate = vi.fn().mockReturnThis();
const mockDbSet = vi.fn().mockReturnThis();
const mockDbWhere = vi.fn().mockReturnThis();
const mockDbInsert = vi.fn().mockReturnThis();
const mockDbValues = vi.fn().mockReturnThis();
const mockDbSelect = vi.fn().mockReturnThis();
const mockDbFrom = vi.fn().mockReturnThis();
const mockDbOrderBy = vi.fn().mockReturnThis();
const mockDbLimit = vi.fn().mockReturnThis();

vi.mock('@/infra/db', () => ({
    getDb: vi.fn().mockResolvedValue({
        update: vi.fn(() => ({
            set: mockDbSet.mockImplementation(() => ({
                where: mockDbWhere
            }))
        })),
        insert: vi.fn(() => ({
            values: mockDbValues
        })),
        select: vi.fn(() => ({
            from: mockDbFrom.mockImplementation(() => ({
                where: mockDbWhere.mockImplementation(() => ({
                    orderBy: mockDbOrderBy.mockImplementation(() => ({
                        limit: mockDbLimit
                    }))
                }))
            }))
        }))
    }),
}));

describe('Operational CRM Actions & Integration', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('requires lostReason when marking stage as LOST', async () => {
        const reqWithoutReason = new Request('http://localhost/api', {
            method: 'PATCH',
            body: JSON.stringify({ stage: 'LOST' })
        });

        const resFail = await StagePatch(reqWithoutReason as any, { params: Promise.resolve({ id: '1' }) });
        const bodyFail = await resFail.json();
        
        expect(resFail.status).toBe(400);
        expect(bodyFail.error.code).toBe('VALIDATION_ERROR');

        const reqWithReason = new Request('http://localhost/api', {
            method: 'PATCH',
            body: JSON.stringify({ stage: 'LOST', lostReason: 'Price too high' })
        });

        const resOk = await StagePatch(reqWithReason as any, { params: Promise.resolve({ id: '1' }) });
        const bodyOk = await resOk.json();
        expect(bodyOk.ok).toBe(true);
    });

    it('returns 409 when service reports optimistic locking conflict', async () => {
        const { conversationService, ConversationStageConflictError } = await import('@/modules/atendimento/conversation.service');
        vi.mocked(conversationService.changeConversationStage).mockRejectedValueOnce(
            new ConversationStageConflictError()
        );

        const req = new Request('http://localhost/api', {
            method: 'PATCH',
            body: JSON.stringify({ stage: 'WON' })
        });

        const res = await StagePatch(req as any, { params: Promise.resolve({ id: '1' }) });
        const body = await res.json();

        expect(res.status).toBe(409);
        expect(body.error.code).toBe('CONFLICT');
    });

    it('uses tenant scope from session in stage change flow', async () => {
        const { conversationRepository } = await import('@/modules/atendimento/conversation.repository');
        const { conversationService } = await import('@/modules/atendimento/conversation.service');

        const req = new Request('http://localhost/api', {
            method: 'PATCH',
            body: JSON.stringify({ stage: 'IN_ATTENDANCE' })
        });

        const res = await StagePatch(req as any, { params: Promise.resolve({ id: 'conv-123' }) });
        expect(res.status).toBe(200);

        expect(conversationRepository.getConversationById).toHaveBeenCalledWith('t1', 'conv-123');
        expect(conversationService.changeConversationStage).toHaveBeenCalledWith(
            't1',
            'conv-123',
            'IN_ATTENDANCE',
            'cust-1',
            undefined
        );
    });

    it('allows assigning an owner symmetrically', async () => {
        const req = new Request('http://localhost/api', {
            method: 'PATCH',
            body: JSON.stringify({ ownerId: 'op2' })
        });

        const res = await OwnerPatch(req as any, { params: Promise.resolve({ id: '1' }) });
        const body = await res.json();
        
        expect(body.ok).toBe(true);
        expect(mockDbSet).toHaveBeenCalledWith({ ownerId: 'op2' });
    });

    it('creates an internal note tied to the customer without advancing pipeline', async () => {
        const req = new Request('http://localhost/api', {
            method: 'POST',
            body: JSON.stringify({ content: 'Internal feedback' })
        });
        
        // Mock the final SELECT query inside POST notes to return our created object
        mockDbWhere.mockResolvedValueOnce([{ id: 'note-1', content: 'Internal feedback' }]);

        const res = await NotesPost(req as any, { params: Promise.resolve({ id: '1' }) });
        const body = await res.json();
        
        expect(body.ok).toBe(true);
        expect(mockDbValues).toHaveBeenCalledWith(expect.objectContaining({
            content: 'Internal feedback',
            authorOperatorId: 'op1'
        }));
    });

    it('lists tasks tied to the customer including correct default OPEN status', async () => {
        const req = new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ title: 'Call Client back', dueAt: new Date().toISOString() }) });
        
        mockDbWhere.mockResolvedValueOnce([{ id: 't-1', title: 'Call Client back' }]);
        const res = await TasksPost(req as any, { params: Promise.resolve({ id: '1' }) });
        expect((await res.json()).ok).toBe(true);
        expect(mockDbValues).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Call Client back',
            status: 'OPEN'
        }));
    });
});
