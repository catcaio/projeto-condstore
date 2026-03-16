import { NextRequest, NextResponse } from 'next/server';
import { notificationsService } from '@/services/notifications.service';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const tenantId = searchParams.get('tenantId');
    const userId = searchParams.get('userId');

    if (!tenantId || !userId) {
        return NextResponse.json(
            { error: 'tenantId and userId are required' },
            { status: 400 },
        );
    }

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
    const body = await request.json();

    const { tenantId, notificationId, markAllRead, userId } = body;

    if (!tenantId) {
        return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    if (markAllRead && userId) {
        await notificationsService.markAllAsRead({ tenantId, userId });
        return NextResponse.json({ ok: true });
    }

    if (notificationId) {
        await notificationsService.markAsRead({ tenantId, notificationId });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'notificationId or markAllRead+userId required' }, { status: 400 });
}
