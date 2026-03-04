import { migrate } from 'drizzle-orm/mysql2/migrator';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

// Load from .env.production if it exists, otherwise rely on system envs (for CI)
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('--- Starting Production Migrations ---');
    const dbUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL or PROD_DATABASE_URL not found in environment.');
        process.exit(1);
    }

    console.log(`Connecting to: ${dbUrl.split('@')[1] || 'URL hidden'}...`);

    let connection;
    try {
        connection = await mysql.createConnection({
            uri: dbUrl,
            ssl: { rejectUnauthorized: true }
        });
    } catch (e: any) {
        console.error('❌ Failed to connect to DB', e.message);
        process.exit(1);
    }

    try {
        const db = drizzle(connection);
        console.log('Running migrator...');

        // Ensure to path string correctly. In CI this is root/drizzle
        const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
        console.log(`Using migrations folder: ${migrationsFolder}`);

        await migrate(db, { migrationsFolder });

        console.log('✅ Migrations applied successfully.');
    } catch (e: any) {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

main().catch((err) => {
    console.error('❌ Unhandled error:', err);
    process.exit(1);
});
