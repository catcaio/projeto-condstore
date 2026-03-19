import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

import { requireSession } from '@/infra/auth/guards';
import { notificationsService } from '@/services/notifications.service';

import { GET, PATCH } from '../route';

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

describe('notifications route hardening regression', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects access when the auth guard does not provide a session', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: false,
            code: 'auth_required' as any,
            requestId: 'req-1',
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        });

        const req = new Request('http://localhost:3000/api/notifications?tenantId=spoofed-tenant&userId=spoofed-user');
        const res = await GET(req as any);

        expect(res.status).toBe(401);
        expect(notificationsService.getUserNotifications).not.toHaveBeenCalled();
        expect(notificationsService.getUnreadCount).not.toHaveBeenCalled();
    });

    it('ignores spoofed tenantId and userId query params on GET to prevent cross-tenant reads', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 'tenant-from-session', sub: 'user-from-session', role: 'member' },
        });
        vi.mocked(notificationsService.getUserNotifications).mockResolvedValue([]);
        vi.mocked(notificationsService.getUnreadCount).mockResolvedValue(0);

        const req = new Request(
            'http://localhost:3000/api/notifications?tenantId=spoofed-tenant&userId=spoofed-user&unreadOnly=true',
        );

        const res = await GET(req as any);

        expect(res.status).toBe(200);
        expect(notificationsService.getUserNotifications).toHaveBeenCalledWith({
            tenantId: 'tenant-from-session',
            userId: 'user-from-session',
            unreadOnly: true,
            limit: 50,
            offset: 0,
        });
        expect(notificationsService.getUnreadCount).toHaveBeenCalledWith({
            tenantId: 'tenant-from-session',
            userId: 'user-from-session',
        });
        expect(notificationsService.getUserNotifications).not.toHaveBeenCalledWith(
            expect.objectContaining({ tenantId: 'spoofed-tenant' }),
        );
        expect(notificationsService.getUserNotifications).not.toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'spoofed-user' }),
        );
    });

    it('ignores spoofed tenantId and userId in PATCH markAllRead payloads', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 'tenant-from-session', sub: 'user-from-session', role: 'member' },
        });

        const req = new Request('http://localhost:3000/api/notifications', {
            method: 'PATCH',
            body: JSON.stringify({
                tenantId: 'spoofed-tenant',
                userId: 'spoofed-user',
                markAllRead: true,
            }),
        });

        const res = await PATCH(req as any);

        expect(res.status).toBe(200);
        expect(notificationsService.markAllAsRead).toHaveBeenCalledWith({
            tenantId: 'tenant-from-session',
            userId: 'user-from-session',
        });
        expect(notificationsService.markAllAsRead).not.toHaveBeenCalledWith({
            tenantId: 'spoofed-tenant',
            userId: 'spoofed-user',
        });
    });

    it('prevents cross-tenant notification updates by resolving the tenant from the session', async () => {
        vi.mocked(requireSession).mockResolvedValue({
            ok: true,
            requestId: 'req-1',
            session: { tenantId: 'tenant-from-session', sub: 'user-from-session', role: 'member' },
        });

        const req = new Request('http://localhost:3000/api/notifications', {
            method: 'PATCH',
            body: JSON.stringify({
                tenantId: 'another-tenant',
                notificationId: 'notif-123',
            }),
        });

        const res = await PATCH(req as any);

        expect(res.status).toBe(200);
        expect(notificationsService.markAsRead).toHaveBeenCalledWith({
            tenantId: 'tenant-from-session',
            notificationId: 'notif-123',
        });
        expect(notificationsService.markAsRead).not.toHaveBeenCalledWith({
            tenantId: 'another-tenant',
            notificationId: 'notif-123',
        });
    });
});
