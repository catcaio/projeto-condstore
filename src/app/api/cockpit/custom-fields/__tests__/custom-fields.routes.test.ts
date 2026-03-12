import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        session: { tenantId: 't1', sub: 'u1' }
    })
}));

vi.mock('@/modules/custom-fields/custom-fields.service', () => ({
    customFieldsService: {
        getFields: vi.fn().mockResolvedValue([{ id: '1', fieldKey: 'doc', entity: 'customer' }]),
        createField: vi.fn().mockResolvedValue({ id: '2', fieldKey: 'new', entity: 'customer' }),
    }
}));

describe('Custom Fields API Routes', () => {
    it('GET should return 200 with custom fields', async () => {
        const req = new NextRequest(new URL('http://localhost/api/cockpit/custom-fields?entity=customer'));
        const res = await GET(req);
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.data[0].fieldKey).toBe('doc');
    });

    it('GET should reject if entity is missing', async () => {
        const req = new NextRequest(new URL('http://localhost/api/cockpit/custom-fields'));
        const res = await GET(req);
        expect(res.status).toBe(400); 
    });

    it('POST should correctly parse payload and create field', async () => {
        const req = new NextRequest(new URL('http://localhost/api/cockpit/custom-fields'), {
            method: 'POST',
            body: JSON.stringify({ entity: 'customer', fieldKey: 'new_doc', label: 'Doc', type: 'text' })
        });
        const res = await POST(req);
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.ok).toBe(true);
    });

    it('POST should reject invalid payload schema', async () => {
        const req = new NextRequest(new URL('http://localhost/api/cockpit/custom-fields'), {
            method: 'POST',
            body: JSON.stringify({ entity: 'BAD_ENTITY', fieldKey: '123_#', type: 'unknown' }) // Invalid field key, type and entity
        });
        const res = await POST(req);
        expect(res.status).toBe(400); 
    });
});
