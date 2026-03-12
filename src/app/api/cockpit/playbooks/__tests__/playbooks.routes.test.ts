import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

const mockListPlaybooks = vi.hoisted(() => vi.fn());
const mockCreatePlaybook = vi.hoisted(() => vi.fn());

vi.mock('@/modules/playbooks/playbooks.service', () => ({
    playbooksService: {
        listPlaybooks: mockListPlaybooks,
        createPlaybook: mockCreatePlaybook,
    }
}));

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        session: { tenantId: 'tenant-1', sub: 'op-123' },
    }),
}));

describe('Playbooks API Routes', () => {
    it('GET /api/cockpit/playbooks returns playbooks for tenant', async () => {
        mockListPlaybooks.mockResolvedValue([{ id: 'pb-1' }]);
        
        const req = new NextRequest('http://localhost/api/cockpit/playbooks');
        const res = await GET(req);
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.data[0].id).toBe('pb-1');
        expect(mockListPlaybooks).toHaveBeenCalledWith('tenant-1', null);
    });

    it('POST /api/cockpit/playbooks validates and creates a playbook', async () => {
        mockCreatePlaybook.mockResolvedValue({ id: 'pb-new', name: 'New pb' });
        
        const req = new NextRequest('http://localhost/api/cockpit/playbooks', {
            method: 'POST',
            body: JSON.stringify({
                name: 'New pb',
                entity: 'conversation',
                isActive: true,
                steps: []
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.data.name).toBe('New pb');
    });

    it('POST /api/cockpit/playbooks rejects invalid payload', async () => {
        const req = new NextRequest('http://localhost/api/cockpit/playbooks', {
            method: 'POST',
            body: JSON.stringify({
                name: '', // Empty name fails length validation
                entity: 'invalid-entity',
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});
