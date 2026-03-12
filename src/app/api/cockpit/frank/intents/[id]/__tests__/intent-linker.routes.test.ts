import { describe, it, expect, vi } from 'vitest';
import { POST as LinkPOST } from '../link-playbook/route';
import { POST as CreatePOST } from '../create-playbook/route';
import { NextRequest } from 'next/server';

const mockLinkExistingPlaybook = vi.hoisted(() => vi.fn());
const mockCreatePlaybookFromIntent = vi.hoisted(() => vi.fn());

vi.mock('@/modules/frank/intent-linker/intent-linker.service', () => ({
    intentLinkerService: {
        linkExistingPlaybook: mockLinkExistingPlaybook,
        createPlaybookFromIntent: mockCreatePlaybookFromIntent,
    }
}));

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        session: { tenantId: 'tenant-1' },
    }),
}));

describe('Intent Linker Routes', () => {
    it('POST link-playbook should link successfully', async () => {
        mockLinkExistingPlaybook.mockResolvedValue(true);

        const req = new NextRequest('http://localhost/api/cockpit/frank/intents/intent-1/link-playbook', {
            method: 'POST',
            body: JSON.stringify({ playbookId: '123e4567-e89b-12d3-a456-426614174000' })
        });

        const res = await LinkPOST(req, { params: Promise.resolve({ id: 'intent-1' }) });
        
        expect(res.status).toBe(200);
        expect(mockLinkExistingPlaybook).toHaveBeenCalledWith('tenant-1', 'intent-1', '123e4567-e89b-12d3-a456-426614174000', expect.any(String));
    });

    it('POST create-playbook should create and link', async () => {
        mockCreatePlaybookFromIntent.mockResolvedValue('new-playbook-123');

        const req = new NextRequest('http://localhost/api/cockpit/frank/intents/intent-to-create/create-playbook', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Test',
                intent: 'TEST_INTENT',
                responseBase: 'Yes',
                triggerPhrases: ['hi']
            })
        });

        const res = await CreatePOST(req, { params: Promise.resolve({ id: 'intent-to-create' }) });
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.data.playbookId).toBe('new-playbook-123');
        expect(mockCreatePlaybookFromIntent).toHaveBeenCalledWith('tenant-1', 'intent-to-create', expect.objectContaining({ name: 'Test' }), expect.any(String));
    });

    it('POST create-playbook should reject invalid schema', async () => {
        const req = new NextRequest('http://localhost/api/cockpit/frank/intents/intent-to-create/create-playbook', {
            method: 'POST',
            body: JSON.stringify({
                name: '', // should fail min 1
                intent: 'TEST',
            })
        });

        const res = await CreatePOST(req, { params: Promise.resolve({ id: 'intent-to-create' }) });
        expect(res.status).toBe(400); // Bad Request (Validation Error)
    });
});
