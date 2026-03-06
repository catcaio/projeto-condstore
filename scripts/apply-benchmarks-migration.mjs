import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';

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
      CREATE TABLE IF NOT EXISTS \`supreme_benchmarks\` (
        \`id\` varchar(36) NOT NULL,
        \`benchmark_domain\` varchar(40) NOT NULL,
        \`benchmark_metric\` varchar(80) NOT NULL,
        \`segment_key\` varchar(120) NOT NULL,
        \`sample_size\` int NOT NULL,
        \`p25\` double,
        \`p50\` double,
        \`p75\` double,
        \`computed_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`pk_supreme_benchmarks\` PRIMARY KEY(\`id\`)
      )
    `);

        for (const [idxName, cols] of [
            ['idx_sb_domain_metric_segment', '`benchmark_domain`,`benchmark_metric`,`segment_key`'],
            ['idx_sb_computed_at', '`computed_at`'],
        ]) {
            const [rows] = await conn.execute(
                `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_NAME = 'supreme_benchmarks' AND INDEX_NAME = ?`,
                [idxName]
            );
            if (rows[0].cnt === 0) {
                await conn.execute(`CREATE INDEX \`${idxName}\` ON \`supreme_benchmarks\` (${cols})`);
                console.log(`  ✅ Index ${idxName} created.`);
            } else { console.log(`  ℹ️  Index ${idxName} already exists.`); }
        }

        console.log('✅ supreme_benchmarks table created/verified.\n🎉 Migration 0055 applied.');
    } finally { conn.release(); await pool.end(); }
}
run().catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1); });
