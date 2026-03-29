import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { searchService } from '@/services/search.service';
import { requireSession } from '@/infra/auth/guards';
import { NextResponse } from 'next/server';

vi.mock('@/infra/auth/guards', () => ({
    requireSession: vi.fn(),
}));

vi.mock('@/services/search.service', () => ({
    searchService: {
        searchEntities: vi.fn(),
    },
}));

describe('Global Search API Security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns unauthorized when no session is present', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: false,
            code: 'auth_required' as any,
            requestId: 'req-1',
            response: NextResponse.json({ ok: false, error: { code: 'AUTH_REQUIRED' as any, requestId: 'req-1', message: 'Unauthorized' } }, { status: 401 }),
        });

        const req = new Request('http://localhost:3000/api/search?q=test');
        const res = await GET(req as any);
        
        expect(res.status).toBe(401);
        expect(searchService.searchEntities).not.toHaveBeenCalled();
    });

    it('resolves tenantId from session and ignores payload inputs', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 'session-tenant', sub: 'user-1', role: 'operator', email: 'test@cond.store', sv: 1 },
        });

        vi.mocked(searchService.searchEntities).mockResolvedValue([]);

        // Client trying to sneak a different tenantId in query
        const req = new Request('http://localhost:3000/api/search?q=query&tenantId=fake-tenant');
        const res = await GET(req as any);
        
        expect(res.status).toBe(200);
        // Ensure it searches within 'real-tenant', completely ignoring 'fake-tenant'
        expect(searchService.searchEntities).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'session-tenant',
            query: 'query',
        }));
    });
});
