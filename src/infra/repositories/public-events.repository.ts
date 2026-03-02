import { getDb } from '../db';
import { publicEvents } from '../../drizzle/schema';
import type { NewPublicEventRecord } from '../../drizzle/schema';

export const publicEventsRepository = {
    async create(data: NewPublicEventRecord): Promise<void> {
        const db = await getDb();
        await db.insert(publicEvents).values(data);
    },
};
