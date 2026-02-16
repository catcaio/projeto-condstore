import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import { users, type UserRecord } from '../../drizzle/schema';
import { logger } from '../logger';
import { ErrorCode, InfrastructureError } from '../errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any = null;

async function getDb() {
    if (dbInstance) return dbInstance;

    if (!process.env.DATABASE_URL) {
        throw new InfrastructureError(
            ErrorCode.INTERNAL_ERROR,
            'DATABASE_URL is not defined'
        );
    }

    const connectionPool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: true,
        },
    });

    dbInstance = drizzle(connectionPool, { mode: 'default' });

    try {
        const conn = await connectionPool.getConnection();
        logger.info('UserRepository: DB connected successfully');
        conn.release();
    } catch (err) {
        logger.error('UserRepository: DB connection failed', err as Error);
        throw new InfrastructureError(
            ErrorCode.INTERNAL_ERROR,
            'Database connection verification failed',
            { error: (err as Error).message }
        );
    }

    return dbInstance;
}

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
