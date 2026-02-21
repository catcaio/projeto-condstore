import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

// Create the connection pool
const poolConnection = mysql.createPool({
    uri: process.env.DATABASE_URL,
});

export const db = drizzle(poolConnection);

// Helper for unix timestamps (ms) uniformly used in the app
export const nowUnix = () => Date.now();
