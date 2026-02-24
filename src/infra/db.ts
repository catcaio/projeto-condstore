
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { logger } from './logger';
import { InfrastructureError, ErrorCode } from './errors';

// Prevent multiple pools in development due to HMR
const globalForDb = globalThis as unknown as {
    conn: mysql.Pool | undefined;
};

function validateAndLogDbUrl(): string {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new InfrastructureError(
            ErrorCode.DATABASE_URL_MISSING,
            'DATABASE_URL is not set. Set it in your Vercel environment variables.'
        );
    }
    // Check that the URL contains a database name (must end with /lojacond or similar)
    try {
        const url = new URL(dbUrl);
        const dbName = url.pathname.replace(/^\//, '');
        if (!dbName) {
            throw new InfrastructureError(
                ErrorCode.DATABASE_URL_MISSING,
                `DATABASE_URL is missing a database name. Expected: "/lojacond"`
            );
        }
        logger.info(`DB pool init: host=${url.hostname}, database=${dbName}`);
    } catch (parseErr: any) {
        // Only rethrow InfrastructureError; other errors become infrastructure errors too
        if (parseErr instanceof InfrastructureError) throw parseErr;
        throw new InfrastructureError(
            ErrorCode.DATABASE_URL_MISSING,
            `DATABASE_URL has an invalid format`
        );
    }
    return dbUrl;
}

export async function getDb() {
    // Lazy initialization: only create pool when getDb() is first called
    if (!globalForDb.conn) {
        const dbUrl = validateAndLogDbUrl();
        globalForDb.conn = mysql.createPool({
            uri: dbUrl,
            connectionLimit: 10,
            multipleStatements: false,
            timezone: 'Z',
            ssl: { rejectUnauthorized: true },
        });
    }
    // Return drizzle instance using the singleton pool
    return drizzle(globalForDb.conn, { mode: 'default' });
}

