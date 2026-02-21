import { db, nowUnix } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { User } from '../auth/userStore'; // Keep interface

export async function createUser(id: string, email: string, passwordHash: string): Promise<User> {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
        throw new Error('User already exists');
    }

    const now = nowUnix();

    await db.insert(users).values({
        id,
        email,
        passwordHash,
        createdAt: now,
        updatedAt: now,
    });

    return {
        id,
        email,
        passwordHash,
        createdAt: now,
    };
}

export async function findUserByEmail(email: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return results.length > 0 ? results[0] : null;
}

export async function findUserById(id: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return results.length > 0 ? results[0] : null;
}
