import { db, nowUnix } from '../db/client';
import { subscriptions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { SubscriptionRecord } from '../billing/types';

export async function upsertSubscription(record: SubscriptionRecord): Promise<void> {
    const now = nowUnix();

    await db.insert(subscriptions).values({
        userId: record.userId,
        stripeCustomerId: record.stripeCustomerId,
        stripeSubscriptionId: record.stripeSubscriptionId,
        stripePriceId: record.stripePriceId,
        planId: record.planId,
        status: record.status,
        currentPeriodEnd: record.currentPeriodEnd,
        cancelAtPeriodEnd: record.cancelAtPeriodEnd,
        updatedAt: now,
    }).onDuplicateKeyUpdate({
        set: {
            stripeCustomerId: record.stripeCustomerId,
            stripeSubscriptionId: record.stripeSubscriptionId,
            stripePriceId: record.stripePriceId,
            planId: record.planId,
            status: record.status,
            currentPeriodEnd: record.currentPeriodEnd,
            cancelAtPeriodEnd: record.cancelAtPeriodEnd,
            updatedAt: now,
        }
    });
}

export async function getSubscription(userId: string): Promise<SubscriptionRecord | null> {
    const results = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
    if (results.length === 0) return null;

    const sub = results[0];
    return {
        userId: sub.userId,
        stripeCustomerId: sub.stripeCustomerId,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        stripePriceId: sub.stripePriceId,
        planId: sub.planId,
        status: sub.status as any,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        updatedAt: sub.updatedAt,
    };
}

export async function getAllSubscriptions(): Promise<SubscriptionRecord[]> {
    const results = await db.select().from(subscriptions);
    return results.map(sub => ({
        userId: sub.userId,
        stripeCustomerId: sub.stripeCustomerId,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        stripePriceId: sub.stripePriceId,
        planId: sub.planId,
        status: sub.status as any,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        updatedAt: sub.updatedAt,
    }));
}
