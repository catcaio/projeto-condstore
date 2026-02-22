import { sql } from 'drizzle-orm';
import { getDb } from '../../infra/db';
import { users } from '../../drizzle/schema';
import { logger } from '../../infra/logger';
import { ErrorCode, InfrastructureError } from '../../infra/errors';

/**
 * Invalidates all active sessions for a given user by incrementing
 * their sessionVersion in the database.
 * 
 * Future JWT session tokens must match this new sequence number to be valid.
 * Existing tokens will be rejected.
 */
export async function invalidateSessions(userId: string): Promise<boolean> {
    try {
        const db = await getDb();

        // Drizzle ORM requires sql`` template literal for raw queries
        const [result] = await db.execute(
            sql`UPDATE users SET session_version = session_version + 1 WHERE id = ${userId}`
        );

        const affectedRows = (result as any)?.affectedRows ?? 0;

        if (affectedRows > 0) {
            logger.info('User sessions invalidated (session_version incremented)', { userId });
        } else {
            logger.warn('Failed to invalidate sessions: User not found', { userId });
            return false;
        }

        return true;
    } catch (error) {
        logger.error('Database error invalidating sessions', error as Error, { userId });
        throw new InfrastructureError(
            ErrorCode.INTERNAL_ERROR,
            'Falha ao invalidar sessões do usuário'
        );
    }
}
