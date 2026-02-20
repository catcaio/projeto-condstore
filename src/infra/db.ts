
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { logger } from './logger';

// Prevent multiple pools in development due to HMR
const globalForDb = globalThis as unknown as {
    conn: mysql.Pool | undefined;
};

function validateAndLogDbUrl(): string {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error(
            'DATABASE_URL is not set. Set it in your Vercel environment variables.'
        );
    }
    // Check that the URL contains a database name (must end with /lojacond or similar)
    try {
        const url = new URL(dbUrl);
        const dbName = url.pathname.replace(/^\//, '');
        if (!dbName) {
            throw new Error(
                `DATABASE_URL is missing a database name. Current path: "${url.pathname}". Expected: "/lojacond"`
            );
        }
        logger.info(`DB pool init: host=${url.hostname}, database=${dbName}`);
    } catch (parseErr: any) {
        // Only rethrow our own errors; URL parse failures mean it's a bad URL format
        if (parseErr.message.startsWith('DATABASE_URL')) throw parseErr;
        throw new Error(`DATABASE_URL has an invalid format: ${parseErr.message}`);
    }
    return dbUrl;
}

// Singleton initialization
if (!globalForDb.conn) {
    const dbUrl = validateAndLogDbUrl();
    globalForDb.conn = mysql.createPool({
        uri: dbUrl,
        connectionLimit: 10,
        multipleStatements: true,
        timezone: 'Z',
        ssl: { rejectUnauthorized: true },
    });
}

export async function getDb() {
    // Return drizzle instance using the singleton pool
    return drizzle(globalForDb.conn!, { mode: 'default' });
}

