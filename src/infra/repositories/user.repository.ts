import { getDb } from '../db';
import { eq } from 'drizzle-orm';
import { users, type UserRecord } from '../../drizzle/schema';
import { logger } from '../logger';
import { ErrorCode, InfrastructureError } from '../errors';


export class UserRepository {
    async getUserByEmail(email: string): Promise<UserRecord | null> {
        try {
            const db = await getDb();
            const results = await db
                .select()
                .from(users)
                .where(eq(users.email, email.toLowerCase().trim()))
                .limit(1);

            return results.length > 0 ? results[0] : null;
        } catch (error) {
            logger.error('Failed to get user by email', error as Error, { email });
            throw new InfrastructureError(
                ErrorCode.INTERNAL_ERROR,
                'Failed to get user',
                { email }
            );
        }
    }

    async getUserById(id: string): Promise<UserRecord | null> {
        try {
            const db = await getDb();
            const results = await db
                .select()
                .from(users)
                .where(eq(users.id, id))
                .limit(1);

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
}

export const userRepository = new UserRepository();
