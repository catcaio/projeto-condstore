/**
 * apply-security-incidents.mjs
 * Applies migration 0048_security_incidents.sql directly to the database using DATABASE_URL.
 * Uses IF NOT EXISTS to be idempotent.
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars from .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('❌ DATABASE_URL not set in environment');
    process.exit(1);
}

console.log('📦 Connecting to database...');

const caPath = path.resolve('./certs/ca.pem');
const sslConfig = fs.existsSync(caPath)
    ? { ssl: { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true } }
    : { ssl: { rejectUnauthorized: false } };

const pool = mysql.createPool({
    uri: dbUrl,
    ...sslConfig,
});

async function run() {
    const conn = await pool.getConnection();
    try {
        console.log('🏗️  Creating security_incidents table (IF NOT EXISTS)...');
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`security_incidents\` (
        \`id\` varchar(36) NOT NULL,
        \`reason\` varchar(100) NOT NULL,
        \`count\` int NOT NULL,
        \`route\` varchar(255),
        \`ip_hash\` varchar(64),
        \`window_start\` timestamp NOT NULL,
        \`window_end\` timestamp NOT NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`security_incidents_id\` PRIMARY KEY(\`id\`)
      )
    `);
        console.log('✅ Table security_incidents created/verified.');

        // Indexes (ignore duplicate key errors)
        try {
            await conn.execute(`CREATE INDEX \`idx_sec_incidents_created_at\` ON \`security_incidents\` (\`created_at\`)`);
            console.log('✅ Index idx_sec_incidents_created_at created.');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️  Index idx_sec_incidents_created_at already exists.');
            } else throw e;
        }

        try {
            await conn.execute(`CREATE INDEX \`idx_sec_incidents_reason_window\` ON \`security_incidents\` (\`reason\`, \`window_end\`)`);
            console.log('✅ Index idx_sec_incidents_reason_window created.');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️  Index idx_sec_incidents_reason_window already exists.');
            } else throw e;
        }

        // Verify the table is accessible
        const [rows] = await conn.execute(`SELECT COUNT(*) AS cnt FROM \`security_incidents\``);
        const cnt = rows[0].cnt;
        console.log(`\n✅ security_incidents table verified (${cnt} rows).`);
        console.log('\n🎉 Migration 0048 applied successfully.');
    } finally {
        conn.release();
        await pool.end();
    }
}

run().catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
