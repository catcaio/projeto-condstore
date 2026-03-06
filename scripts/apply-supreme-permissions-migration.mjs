/**
 * apply-supreme-permissions-migration.mjs
 * Applies migration 0050 (tenant_supreme_permissions) to the database.
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
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`tenant_supreme_permissions\` (
        \`tenant_id\` varchar(36) NOT NULL,
        \`allow_read_metrics\` boolean NOT NULL DEFAULT true,
        \`allow_generate_recommendations\` boolean NOT NULL DEFAULT true,
        \`allow_execute_optimizations\` boolean NOT NULL DEFAULT false,
        \`allow_ads_budget_changes\` boolean NOT NULL DEFAULT false,
        \`allow_crm_actions\` boolean NOT NULL DEFAULT false,
        \`allow_whatsapp_automation\` boolean NOT NULL DEFAULT true,
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`pk_tenant_supreme_permissions\` PRIMARY KEY(\`tenant_id\`)
      )
    `);
        console.log('✅ tenant_supreme_permissions created/verified.');
        console.log('\n🎉 Migration 0050 applied successfully.');
    } finally {
        conn.release();
        await pool.end();
    }
}

run().catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1); });
