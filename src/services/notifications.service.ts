import { randomUUID } from 'crypto';
import { getDb } from '@/infra/db';
import { notifications } from '@/drizzle/schema';
import { logger } from '@/infra/logger';
import { eq, and, desc, sql } from 'drizzle-orm';

// --- Types ---

export const NotificationTypes = [
    'lead_hot',
    'lead_followup_due',
    'order_stuck',
    'shipment_delayed',
    'new_message',
] as const;

export type NotificationType = typeof NotificationTypes[number];
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// --- Service ---

export const notificationsService = {
    /**
     * Create a notification for a user.
     */
    async createNotification(params: {
        tenantId: string;
        userId: string;
        type: NotificationType;
        entityType?: string;
        entityId?: string;
        priority?: NotificationPriority;
        payload?: Record<string, unknown>;
    }): Promise<string> {
        const db = await getDb();
        const id = randomUUID();

        try {
            await db.insert(notifications).values({
                id,
                tenantId: params.tenantId,
                userId: params.userId,
                type: params.type,
                entityType: params.entityType ?? null,
                entityId: params.entityId ?? null,
                priority: params.priority ?? 'normal',
                payload: params.payload ?? null,
                read: false,
            });

            logger.info('notification_created', { id, type: params.type, userId: params.userId });
            return id;
        } catch (err) {
            logger.error('notification_create_failed', err as Error, { type: params.type });
            throw err;
        }
    },

    /**
     * Get notifications for a user, newest first.
     */
    async getUserNotifications(params: {
        tenantId: string;
        userId: string;
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }) {
        const db = await getDb();
        const conditions = [
            eq(notifications.tenantId, params.tenantId),
            eq(notifications.userId, params.userId),
        ];

        if (params.unreadOnly) {
            conditions.push(eq(notifications.read, false));
        }

        return db
            .select()
            .from(notifications)
            .where(and(...conditions))
            .orderBy(desc(notifications.createdAt))
            .limit(params.limit ?? 50)
            .offset(params.offset ?? 0);
    },

    /**
     * Mark a notification as read.
     */
    async markAsRead(params: {
        tenantId: string;
        notificationId: string;
    }): Promise<void> {
        const db = await getDb();

        await db
            .update(notifications)
            .set({ read: true })
            .where(
                and(
                    eq(notifications.id, params.notificationId),
                    eq(notifications.tenantId, params.tenantId),
                )
            );
    },

    /**
     * Mark all notifications as read for a user.
     */
    async markAllAsRead(params: {
        tenantId: string;
        userId: string;
    }): Promise<void> {
        const db = await getDb();

        await db
            .update(notifications)
            .set({ read: true })
            .where(
                and(
                    eq(notifications.tenantId, params.tenantId),
                    eq(notifications.userId, params.userId),
                    eq(notifications.read, false),
                )
            );
    },

    /**
     * Get unread notification count.
     */
    async getUnreadCount(params: {
        tenantId: string;
        userId: string;
    }): Promise<number> {
        const db = await getDb();

        const result = await db
            .select({ count: sql<number>`count(*)` })
            .from(notifications)
            .where(
                and(
                    eq(notifications.tenantId, params.tenantId),
                    eq(notifications.userId, params.userId),
                    eq(notifications.read, false),
                )
            );

        return result[0]?.count ?? 0;
    },
};
