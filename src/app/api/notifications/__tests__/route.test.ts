import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '../route';
import { notificationsService } from '@/services/notifications.service';
import { requireSession } from '@/infra/auth/guards';
import { NextResponse } from 'next/server';

vi.mock('@/infra/auth/guards', () => ({
    requireSession: vi.fn(),
}));

vi.mock('@/services/notifications.service', () => ({
    notificationsService: {
        getUserNotifications: vi.fn(),
        getUnreadCount: vi.fn(),
        markAllAsRead: vi.fn(),
        markAsRead: vi.fn(),
    },
}));

describe('Global Notifications API Security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('GET returns unauthorized without session', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: false,
            code: 'auth_required' as any,
            requestId: 'req-1',
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        });

        const req = new Request('http://localhost:3000/api/notifications');
        const res = await GET(req as any);
        
        expect(res.status).toBe(401);
    });

    it('PATCH returns unauthorized without session', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: false,
            code: 'auth_required' as any,
            requestId: 'req-1',
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        });

        const req = new Request('http://localhost:3000/api/notifications', { method: 'PATCH', body: JSON.stringify({}) });
        const res = await PATCH(req as any);
        
        expect(res.status).toBe(401);
    });

    it('GET resolves tenant/user from session, ignoring client query', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 'real-t', sub: 'real-u', role: 'member' },
        });

        vi.mocked(notificationsService.getUserNotifications).mockResolvedValue([]);
        vi.mocked(notificationsService.getUnreadCount).mockResolvedValue(0);

        const req = new Request('http://localhost:3000/api/notifications?tenantId=fake-t&userId=fake-u');
        await GET(req as any);

        expect(notificationsService.getUserNotifications).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'real-t',
            userId: 'real-u',
        }));
    });

    it('PATCH resolves tenant/user from session, ignoring client body', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 'real-t', sub: 'real-u', role: 'member' },
        });

        const req = new Request('http://localhost:3000/api/notifications', {
            method: 'PATCH',
            body: JSON.stringify({ tenantId: 'fake', userId: 'fake2', markAllRead: true }),
        });
        
        await PATCH(req as any);

        expect(notificationsService.markAllAsRead).toHaveBeenCalledWith({
            tenantId: 'real-t',
            userId: 'real-u',
        });
    });
});
