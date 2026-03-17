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
      CREATE TABLE IF NOT EXISTS \`ecosystem_events\` (
        \`id\` varchar(36) NOT NULL,
        \`tenant_id\` varchar(36) NOT NULL,
        \`type\` varchar(100) NOT NULL,
        \`entity_type\` varchar(100) NOT NULL,
        \`entity_id\` varchar(255) NULL,
        \`payload_json\` json NULL,
        \`actor\` varchar(255) NOT NULL,
        \`source\` varchar(100) NOT NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`pk_ecosystem_events\` PRIMARY KEY(\`id\`)
      )
    `);

        // Indexes
        for (const [idxName, cols] of [
            ['idx_eco_events_tenant_type', '\`tenant_id\`, \`type\`, \`created_at\`'],
            ['idx_eco_events_tenant_entity', '\`tenant_id\`, \`entity_type\`, \`entity_id\`'],
            ['idx_eco_events_created_at', '\`created_at\`'],
        ]) {
            const [rows] = await conn.execute(
                `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_NAME = 'ecosystem_events' AND INDEX_NAME = ?`,
                [idxName]
            );
            if (rows[0].cnt === 0) {
                await conn.execute(`CREATE INDEX \`${idxName}\` ON \`ecosystem_events\` (${cols})`);
                console.log(`  ✅ Index ${idxName} created.`);
            } else {
                console.log(`  ℹ️  Index ${idxName} already exists.`);
            }
        }
        console.log('✅ ecosystem_events created/verified.');
    } finally {
        conn.release();
        await pool.end();
    }
}
run().catch(err => { console.error('❌ Migration failed:', err); process.exit(1); });
