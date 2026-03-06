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
      CREATE TABLE IF NOT EXISTS \`operational_events\` (
        \`id\` varchar(36) NOT NULL,
        \`tenant_id\` varchar(36) NOT NULL,
        \`event_type\` varchar(80) NOT NULL,
        \`event_domain\` varchar(40) NOT NULL,
        \`entity_id\` varchar(120) NULL,
        \`customer_id\` varchar(120) NULL,
        \`session_id\` varchar(120) NULL,
        \`attribution_id\` varchar(120) NULL,
        \`payload\` json NOT NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`pk_operational_events\` PRIMARY KEY(\`id\`)
      )
    `);

        // Indexes (IF NOT EXISTS pattern for idempotency)
        for (const [idxName, cols] of [
            ['idx_op_events_tenant_domain_time', '`tenant_id`, `event_domain`, `created_at`'],
            ['idx_op_events_tenant_type_time', '`tenant_id`, `event_type`, `created_at`'],
            ['idx_op_events_tenant_customer_time', '`tenant_id`, `customer_id`, `created_at`'],
        ]) {
            const [rows] = await conn.execute(
                `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_NAME = 'operational_events' AND INDEX_NAME = ?`,
                [idxName]
            );
            if (rows[0].cnt === 0) {
                await conn.execute(`CREATE INDEX \`${idxName}\` ON \`operational_events\` (${cols})`);
                console.log(`  ✅ Index ${idxName} created.`);
            } else {
                console.log(`  ℹ️  Index ${idxName} already exists.`);
            }
        }
        console.log('✅ operational_events created/verified.\n🎉 Migration 0051 applied.');
    } finally {
        conn.release();
        await pool.end();
    }
}
run().catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1); });
