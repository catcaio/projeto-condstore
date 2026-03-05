import { SubscriptionRecord } from './types';
import fs from 'fs';
import path from 'path';

// In a serverless environment like Vercel, /tmp is the only writable directory.
// Fallback to memory if fs is totally restricted.
const DB_FILE_PATH = path.join(process.cwd(), '.tmp-billing-store.json');

let memoryStore: Record<string, SubscriptionRecord> = {};

function readStore(): Record<string, SubscriptionRecord> {
    try {
        if (fs.existsSync(DB_FILE_PATH)) {
            const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.warn("Could not read local JSON store, falling back to memory:", err);
    }
    return memoryStore;
}

function writeStore(store: Record<string, SubscriptionRecord>) {
    try {
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
    } catch (err) {
        console.warn("Could not write to local JSON store, using memory only:", err);
    }
    memoryStore = store;
}

/**
 * Upserts a subscription record.
 * Uses the userId as the primary key.
 */
export async function upsertSubscription(record: SubscriptionRecord): Promise<void> {
    const store = readStore();
    store[record.userId] = record;
    writeStore(store);
    console.info(`[Store] Upserted subscription for user: ${record.userId}`);
}

/**
 * Retrieves a subscription record for a given user.
 */
export async function getSubscription(userId: string): Promise<SubscriptionRecord | null> {
    const store = readStore();
    return store[userId] || null;
}
