import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

const mockGetTimeline = vi.hoisted(() => vi.fn());

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        session: { tenantId: 't1', sub: 'u1' }
    })
}));

vi.mock('@/modules/timeline/timeline.service', () => ({
    timelineService: {
        getTimeline: mockGetTimeline
    }
}));

import { timelineService } from '@/modules/timeline/timeline.service';

describe('Timeline API Route', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('GET return 200 with timeline array', async () => {
        mockGetTimeline.mockResolvedValueOnce({ events: [{ id: '1', title: 'A' }] });

        const req = new NextRequest(new URL('http://localhost/api/cockpit/timeline?entity=order&limit=10'));
        const res = await GET(req);
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.data.events).toHaveLength(1);
        expect(mockGetTimeline).toHaveBeenCalledWith('t1', 10, undefined, 'order', undefined);
    });
});
