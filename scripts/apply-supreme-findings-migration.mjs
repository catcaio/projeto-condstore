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
      CREATE TABLE IF NOT EXISTS \`supreme_findings\` (
        \`id\` varchar(36) NOT NULL,
        \`tenant_id\` varchar(36) NOT NULL,
        \`finding_type\` varchar(80) NOT NULL,
        \`finding_domain\` varchar(40) NOT NULL,
        \`severity\` varchar(20) NOT NULL,
        \`title\` varchar(160) NOT NULL,
        \`summary\` text NOT NULL,
        \`evidence\` json NOT NULL,
        \`recommended_action_type\` varchar(80) NULL,
        \`recommended_action_payload\` json NULL,
        \`status\` varchar(40) NOT NULL DEFAULT 'OPEN',
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`resolved_at\` timestamp NULL,
        CONSTRAINT \`pk_supreme_findings\` PRIMARY KEY(\`id\`)
      )
    `);

        for (const [idxName, cols] of [
            ['idx_sf_tenant_status_time', '`tenant_id`, `status`, `created_at`'],
            ['idx_sf_tenant_domain_time', '`tenant_id`, `finding_domain`, `created_at`'],
            ['idx_sf_tenant_severity_time', '`tenant_id`, `severity`, `created_at`'],
        ]) {
            const [rows] = await conn.execute(
                `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_NAME = 'supreme_findings' AND INDEX_NAME = ?`,
                [idxName]
            );
            if (rows[0].cnt === 0) {
                await conn.execute(`CREATE INDEX \`${idxName}\` ON \`supreme_findings\` (${cols})`);
                console.log(`  ✅ Index ${idxName} created.`);
            } else { console.log(`  ℹ️  Index ${idxName} already exists.`); }
        }
        console.log('✅ supreme_findings table created/verified.\n🎉 Migration 0053 applied.');
    } finally { conn.release(); await pool.end(); }
}
run().catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1); });
