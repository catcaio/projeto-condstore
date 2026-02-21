import { db, nowUnix } from '../db/client';
import { events } from '../db/schema';
import { gt } from 'drizzle-orm';

export interface EventRecord {
    id: string;
    userId: string | null;
    name: string;
    payloadJson: string;
    createdAt: number;
}

export async function writeEvent(name: string, payload: any, userId?: string | null): Promise<void> {
    const now = nowUnix();
    await db.insert(events).values({
        id: crypto.randomUUID(),
        userId: userId || null,
        name,
        payloadJson: JSON.stringify(payload),
        createdAt: now,
    });
}

export async function listEventsLast30Days(): Promise<EventRecord[]> {
    const thirtyDaysAgo = nowUnix() - (30 * 24 * 60 * 60 * 1000);
    const results = await db.select().from(events).where(gt(events.createdAt, thirtyDaysAgo));

    return results.map(e => ({
        id: e.id,
        userId: e.userId,
        name: e.name,
        payloadJson: e.payloadJson,
        createdAt: e.createdAt,
    }));
}
