/**
 * apply-data-contract-migration.mjs
 * Applies migration 0049 (tenant_data_contract_status) to the database.
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('❌ DATABASE_URL not set'); process.exit(1); }

const caPath = path.resolve('./certs/ca.pem');
const sslConfig = fs.existsSync(caPath)
    ? { ssl: { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true } }
    : { ssl: { rejectUnauthorized: false } };

const pool = mysql.createPool({ uri: dbUrl, ...sslConfig });

async function run() {
    const conn = await pool.getConnection();
    try {
        console.log('🏗️  Creating tenant_data_contract_status table...');
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`tenant_data_contract_status\` (
        \`tenant_id\` varchar(36) NOT NULL,
        \`acquisition_ready\` boolean NOT NULL DEFAULT false,
        \`conversion_ready\` boolean NOT NULL DEFAULT false,
        \`revenue_ready\` boolean NOT NULL DEFAULT false,
        \`retention_ready\` boolean NOT NULL DEFAULT false,
        \`operational_ready\` boolean NOT NULL DEFAULT false,
        \`last_checked_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`pk_tenant_data_contract_status\` PRIMARY KEY(\`tenant_id\`)
      )
    `);
        const [rows] = await conn.execute(`SELECT COUNT(*) AS cnt FROM \`tenant_data_contract_status\``);
        console.log(`✅ tenant_data_contract_status created/verified (${rows[0].cnt} rows).`);
        console.log('\n🎉 Migration 0049 applied successfully.');
    } finally {
        conn.release();
        await pool.end();
    }
}

run().catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1); });
