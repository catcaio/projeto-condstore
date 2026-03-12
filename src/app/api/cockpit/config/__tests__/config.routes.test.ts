import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mocks
vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        session: { tenantId: 't1', sub: 'u1' }
    })
}));

vi.mock('@/modules/config/config.service', () => ({
    configService: {
        listConfigs: vi.fn().mockResolvedValue([{ key: 'test', value: '123' }]),
        setConfig: vi.fn().mockResolvedValue({ key: 'test', value: '123' }),
    }
}));

describe('Config API Routes', () => {
    it('GET should return 200 with configs', async () => {
        const req = new NextRequest(new URL('http://localhost/api/cockpit/config'));
        const res = await GET(req);
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.data[0].key).toBe('test');
    });

    it('POST should correctly parse payload and call service', async () => {
        const req = new NextRequest(new URL('http://localhost/api/cockpit/config'), {
            method: 'POST',
            body: JSON.stringify({ key: 'stages', value: ['A'], category: 'pipeline' })
        });
        const res = await POST(req);
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.ok).toBe(true);
    });

    it('POST should reject invalid category', async () => {
        const req = new NextRequest(new URL('http://localhost/api/cockpit/config'), {
            method: 'POST',
            body: JSON.stringify({ key: 'stages', value: ['A'], category: 'unknown' })
        });
        const res = await POST(req);
        // Validaton error -> 400
        expect(res.status).toBe(400); 
    });
});
