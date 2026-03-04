import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../src/drizzle/schema';
import * as dotenv from 'dotenv';
import path from 'path';

// Load from .env.production if running locally, or rely on Vercel envs
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') }); // fallback

async function main() {
    const dbUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL or PROD_DATABASE_URL not found.');
        process.exit(1);
    }

    console.log(`Connecting to Prod DB: ${dbUrl.split('@')[1] || 'URL hidden'}`);

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
        const [rows] = await connection.execute('SHOW TABLES');
        const tables = (rows as any[]).map(r => Object.values(r)[0]);

        console.log(`Found ${tables.length} tables in Prod DB.`);

        // Check for specific recent auth tables
        const missing = [];
        if (!tables.includes('users')) missing.push('users');
        if (!tables.includes('invites')) missing.push('invites');
        if (!tables.includes('tenant_signup_policies')) missing.push('tenant_signup_policies');

        if (missing.length > 0) {
            console.error('❌ Schema Drift: Missing tables in Prod:', missing.join(', '));
        } else {
            console.log('✅ Auth tables exist.');
            // Check users column specifically
            const [columns] = await connection.execute('SHOW COLUMNS FROM users');
            const colNames = (columns as any[]).map(c => c.Field);

            const missingCols = [];
            if (!colNames.includes('name')) missingCols.push('name');
            if (!colNames.includes('auth_provider')) missingCols.push('auth_provider');
            if (!colNames.includes('provider_id')) missingCols.push('provider_id');
            if (!colNames.includes('email_verify_token')) missingCols.push('email_verify_token');
            if (!colNames.includes('email_verified_at')) missingCols.push('email_verified_at');

            if (missingCols.length > 0) {
                console.error('❌ Schema Drift: Missing columns in users table in Prod:', missingCols.join(', '));
            } else {
                console.log('✅ users table has all required auth columns.');
            }

            // Check if password_hash is nullable
            const passCol = (columns as any[]).find(c => c.Field === 'password_hash');
            if (passCol && passCol.Null === 'NO') {
                console.error('❌ Schema Drift: users.password_hash is NOT NULL, but should be nullable for Google Auth');
            } else {
                console.log('✅ users.password_hash is correctly nullable.');
            }
        }
    } catch (e: any) {
        console.error('❌ Query failed', e.message);
    } finally {
        await connection.end();
    }
}

main().catch(console.error);
