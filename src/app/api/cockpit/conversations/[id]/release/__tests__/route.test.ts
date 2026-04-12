import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PUT } from '../route';
import { requireAdmin } from '@/infra/auth/guards';
import { conversationService } from '@/modules/atendimento/conversation.service';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn(),
}));

vi.mock('@/modules/atendimento/conversation.service', () => ({
    conversationService: {
        getConversationById: vi.fn(),
        unassignConversation: vi.fn().mockResolvedValue(undefined),
        updateConversationStatus: vi.fn().mockResolvedValue(undefined),
    }
}));

describe('Conversation Release Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('releases operator_active conversations back to awaiting_human', async () => {
        vi.mocked(requireAdmin).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 'tenant-1', role: 'admin' },
        } as any);
        vi.mocked(conversationService.getConversationById).mockResolvedValue({
            id: 'conv-1',
            status: 'operator_active',
            customerId: 'cust-1',
        } as any);

        const req = new Request('http://localhost:3000/api/cockpit/conversations/conv-1/release', { method: 'PUT' });
        const context = { params: Promise.resolve({ id: 'conv-1' }) };

        const res = await PUT(req as any, context);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(conversationService.unassignConversation).toHaveBeenCalledWith('tenant-1', 'conv-1', 'cust-1');
        expect(conversationService.updateConversationStatus).toHaveBeenCalledWith(
            'tenant-1',
            'conv-1',
            'awaiting_human',
            'cust-1'
        );
    });
});
