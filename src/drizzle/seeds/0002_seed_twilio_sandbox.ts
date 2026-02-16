/**
 * Seed script to create Twilio Sandbox tenant
 * Run with: npx tsx src/drizzle/seeds/0002_seed_twilio_sandbox.ts
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { tenants } from '../schema';

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

    console.log('🌱 Seeding Twilio Sandbox tenant...');

    try {
        await db.insert(tenants).values({
            id: 'tenant-twilio-sandbox',
            name: 'Twilio Sandbox',
            twilioNumber: 'whatsapp:+14155238886',
        });

        console.log('✅ Twilio Sandbox tenant created successfully');
        console.log('   ID: tenant-twilio-sandbox');
        console.log('   Name: Twilio Sandbox');
        console.log('   Twilio Number: whatsapp:+14155238886');
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.log('ℹ️  Tenant already exists - skipping');
        } else {
            console.error('❌ Failed to create tenant:', error.message);
            throw error;
        }
    } finally {
        await connection.end();
    }
}

seed()
    .then(() => {
        console.log('\n✅ Seed completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Seed failed:', error);
        process.exit(1);
    });
