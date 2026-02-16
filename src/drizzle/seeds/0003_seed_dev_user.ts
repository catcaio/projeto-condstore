/**
 * Seed script to create a dev admin user.
 *
 * PowerShell:
 *   $env:DATABASE_URL="mysql://user:pass@host:port/db?ssl={}"; npx tsx src/drizzle/seeds/0003_seed_dev_user.ts
 *
 * Bash:
 *   DATABASE_URL="mysql://..." npx tsx src/drizzle/seeds/0003_seed_dev_user.ts
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';
import { users } from '../schema';
import { hashPassword } from '../../infra/auth/password';

async function seed() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined');
    }

    const connection = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: true,
        },
    });
    const db = drizzle(connection, { mode: 'default' });

    const email = 'admin@lojacond.com';
    const password = 'senha123';
    const tenantId = 'lojacond-default';

    console.log('Seeding dev admin user...');

    try {
        const passwordHash = hashPassword(password);

        await db.insert(users).values({
            id: randomUUID(),
            email,
            passwordHash,
            tenantId,
            role: 'admin',
        });

        console.log('Dev admin user created successfully');
        console.log(`  Email: ${email}`);
        console.log(`  Password: ${password}`);
        console.log(`  Tenant: ${tenantId}`);
        console.log(`  Role: admin`);
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        if (err.code === 'ER_DUP_ENTRY') {
            console.log('User already exists - skipping');
        } else {
            console.error('Failed to create user:', err.message);
            throw error;
        }
    } finally {
        await connection.end();
    }
}

seed()
    .then(() => {
        console.log('\nSeed completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nSeed failed:', error);
        process.exit(1);
    });
