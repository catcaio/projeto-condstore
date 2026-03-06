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
      CREATE TABLE IF NOT EXISTS \`supreme_actions\` (
        \`id\` varchar(36) NOT NULL,
        \`tenant_id\` varchar(36) NOT NULL,
        \`action_type\` varchar(80) NOT NULL,
        \`action_scope\` varchar(40) NOT NULL,
        \`status\` varchar(40) NOT NULL DEFAULT 'PROPOSED',
        \`proposed_by\` varchar(40) NOT NULL,
        \`approved_by\` varchar(120) NULL,
        \`executed_by\` varchar(40) NULL,
        \`payload\` json NOT NULL,
        \`result\` json NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`approved_at\` timestamp NULL,
        \`executed_at\` timestamp NULL,
        CONSTRAINT \`pk_supreme_actions\` PRIMARY KEY(\`id\`)
      )
    `);

        for (const [idxName, cols] of [
            ['idx_sa_tenant_status_time', '`tenant_id`, `status`, `created_at`'],
            ['idx_sa_tenant_type_time', '`tenant_id`, `action_type`, `created_at`'],
        ]) {
            const [rows] = await conn.execute(
                `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_NAME = 'supreme_actions' AND INDEX_NAME = ?`,
                [idxName]
            );
            if (rows[0].cnt === 0) {
                await conn.execute(`CREATE INDEX \`${idxName}\` ON \`supreme_actions\` (${cols})`);
                console.log(`  ✅ Index ${idxName} created.`);
            } else { console.log(`  ℹ️  Index ${idxName} already exists.`); }
        }
        console.log('✅ supreme_actions table created/verified.\n🎉 Migration 0052 applied.');
    } finally { conn.release(); await pool.end(); }
}
run().catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1); });
