
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { logger } from './logger';

// Prevent multiple pools in development due to HMR
const globalForDb = globalThis as unknown as {
    conn: mysql.Pool | undefined;
};

// Singleton initialization
if (!globalForDb.conn) {
    logger.info('Initializing Database Pool (Singleton)');
    globalForDb.conn = mysql.createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: 10,
        multipleStatements: false,
        timezone: 'Z',
    });
}

export async function getDb() {
    // Return drizzle instance using the singleton pool
    return drizzle(globalForDb.conn!, { mode: 'default' });
}
