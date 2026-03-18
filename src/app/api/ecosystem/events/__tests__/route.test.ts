import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { ecosystemEventsService } from '@/services/ecosystem-events.service';
import { requireSession } from '@/infra/auth/guards';
import { NextResponse } from 'next/server';

vi.mock('@/infra/auth/guards', () => ({
    requireSession: vi.fn(),
}));

vi.mock('@/services/ecosystem-events.service', () => ({
    ecosystemEventsService: {
        getEvents: vi.fn(),
    },
}));

describe('Global Ecosystem Events API Security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns unauthorized when no session is present', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: false,
            code: 'auth_required' as any,
            requestId: 'req-1',
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        });

        const req = new Request('http://localhost:3000/api/ecosystem/events');
        const res = await GET(req as any);
        
        expect(res.status).toBe(401);
    });

    it('resolves tenantId from session and ignores payload inputs', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 'session-tenant', sub: 'user-1', role: 'member' },
        });

        vi.mocked(ecosystemEventsService.getEvents).mockResolvedValue([]);

        const req = new Request('http://localhost:3000/api/ecosystem/events?tenantId=hacked-tenant');
        await GET(req as any);
        
        expect(ecosystemEventsService.getEvents).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'session-tenant',
        }));
    });
});
