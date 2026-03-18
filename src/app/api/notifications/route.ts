import { NextRequest, NextResponse } from 'next/server';
import { notificationsService } from '@/services/notifications.service';
import { requireSession } from '@/infra/auth/guards';

export async function GET(request: NextRequest) {
    const sessionResult = await requireSession(request);
    if (!sessionResult.ok) return sessionResult.response;

    const { tenantId, sub: userId } = sessionResult.session;
    const { searchParams } = new URL(request.url);

    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const [notifications, unreadCount] = await Promise.all([
        notificationsService.getUserNotifications({
            tenantId,
            userId,
            unreadOnly,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
            offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
        }),
        notificationsService.getUnreadCount({ tenantId, userId }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
    const sessionResult = await requireSession(request);
    if (!sessionResult.ok) return sessionResult.response;

    const { tenantId, sub: userId } = sessionResult.session;
    const body = await request.json();

    const { notificationId, markAllRead } = body;

    if (markAllRead === true) {
        await notificationsService.markAllAsRead({ tenantId, userId });
        return NextResponse.json({ ok: true });
    }

    if (notificationId) {
        await notificationsService.markAsRead({ tenantId, notificationId });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'notificationId or markAllRead required' }, { status: 400 });
}
