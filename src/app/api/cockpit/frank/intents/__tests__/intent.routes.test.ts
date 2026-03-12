import { describe, it, expect, vi } from 'vitest';
import { GET } from '../route';
import { POST as ValidatePOST } from '../[id]/validate/route';
import { POST as IgnorePOST } from '../[id]/ignore/route';
import { NextRequest } from 'next/server';

const mockListCaptured = vi.hoisted(() => vi.fn());
const mockValidateIntent = vi.hoisted(() => vi.fn());
const mockIgnoreIntent = vi.hoisted(() => vi.fn());

vi.mock('@/modules/frank/intents/intent.service', () => ({
    intentTrainingService: {
        listCapturedIntents: mockListCaptured,
        validateIntent: mockValidateIntent,
        ignoreIntent: mockIgnoreIntent,
    }
}));

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        session: { tenantId: 'tenant-1' },
    }),
}));

describe('Intent Routes', () => {
    it('GET should return captured intents', async () => {
        mockListCaptured.mockResolvedValue([{ id: 'intent-1' }]);

        const req = new NextRequest('http://localhost/api/cockpit/frank/intents');
        const res = await GET(req);
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.data[0].id).toBe('intent-1');
        expect(mockListCaptured).toHaveBeenCalledWith('tenant-1');
    });

    it('POST validate should validate intent', async () => {
        mockValidateIntent.mockResolvedValue(true);

        const req = new NextRequest('http://localhost/api/cockpit/frank/intents/intent-1/validate', {
            method: 'POST',
        });

        const res = await ValidatePOST(req, { params: Promise.resolve({ id: 'intent-1' }) });
        
        expect(res.status).toBe(200);
        expect(mockValidateIntent).toHaveBeenCalled();
    });

    it('POST ignore should ignore intent', async () => {
        mockIgnoreIntent.mockResolvedValue(true);

        const req = new NextRequest('http://localhost/api/cockpit/frank/intents/intent-2/ignore', {
            method: 'POST',
        });

        const res = await IgnorePOST(req, { params: Promise.resolve({ id: 'intent-2' }) });
        
        expect(res.status).toBe(200);
        expect(mockIgnoreIntent).toHaveBeenCalled();
    });
});
