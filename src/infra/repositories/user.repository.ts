import { getDb } from '../db';
import { eq, sql } from 'drizzle-orm';
import { users, type UserRecord } from '../../drizzle/schema';
import { logger } from '../logger';
import { ErrorCode, InfrastructureError } from '../errors';
import { sha256Hex } from '../attribution/hash';

function hashUserEmailForLog(email: string): string {
    return sha256Hex(email)?.slice(0, 16) ?? 'unknown';
}


export class UserRepository {
    async getUserByEmail(email: string): Promise<UserRecord | null> {
        const normalizedEmail = email.toLowerCase().trim();
        const emailHash = hashUserEmailForLog(normalizedEmail);
        try {
            const db = await getDb();
            const results = await db
                .select()
                .from(users)
                .where(eq(users.email, normalizedEmail));

            return results.length > 0 ? results[0] : null;
        } catch (error) {
            logger.error('Failed to get user by email', error as Error, { emailHash });
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to get user',
                { emailHash }
            );
        }
    }

    async getUserById(id: string): Promise<UserRecord | null> {
        try {
            const db = await getDb();
            const results = await db
                .select()
                .from(users)
                .where(eq(users.id, id));

            return results.length > 0 ? results[0] : null;
        } catch (error) {
            logger.error('Failed to get user by id', error as Error, { id });
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to get user',
                { id }
            );
        }
    }

    async updatePasswordHashAndBumpSessionVersion(userId: string, passwordHash: string): Promise<boolean> {
        try {
            const db = await getDb();
            const [result] = await db.execute(sql`
                UPDATE users
                SET password_hash = ${passwordHash},
                    session_version = session_version + 1
                WHERE id = ${userId}
            `);

            const affectedRows = (result as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
            return affectedRows > 0;
        } catch (error) {
            logger.error('Failed to update user password', error as Error, { userId });
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to update user password',
                { userId }
            );
        }
    }
}

export const userRepository = new UserRepository();
