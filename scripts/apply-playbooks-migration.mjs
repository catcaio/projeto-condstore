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
      CREATE TABLE IF NOT EXISTS \`supreme_playbooks\` (
        \`id\` varchar(36) NOT NULL,
        \`playbook_name\` varchar(120) NOT NULL,
        \`playbook_domain\` varchar(40) NOT NULL,
        \`trigger_finding_type\` varchar(80) NOT NULL,
        \`action_sequence\` json NOT NULL,
        \`expected_metric\` varchar(80) NOT NULL,
        \`success_threshold\` double NOT NULL,
        \`is_active\` boolean NOT NULL DEFAULT true,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`pk_supreme_playbooks\` PRIMARY KEY(\`id\`)
      )
    `);

        for (const [idxName, cols] of [
            ['idx_sp_domain', '`playbook_domain`'],
            ['idx_sp_trigger', '`trigger_finding_type`'],
        ]) {
            const [rows] = await conn.execute(
                `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_NAME = 'supreme_playbooks' AND INDEX_NAME = ?`,
                [idxName]
            );
            if (rows[0].cnt === 0) {
                await conn.execute(`CREATE INDEX \`${idxName}\` ON \`supreme_playbooks\` (${cols})`);
                console.log(`  ✅ Index ${idxName} created.`);
            } else { console.log(`  ℹ️  Index ${idxName} already exists.`); }
        }

        // Seed initial basic playbooks if none exist (useful for testing/demo)
        const [pbRows] = await conn.execute(`SELECT COUNT(*) as cnt from \`supreme_playbooks\``);
        if (pbRows[0].cnt === 0) {
            console.log('🌱 Seeding initial playbooks...');
            await conn.execute(`
        INSERT INTO \`supreme_playbooks\` (id, playbook_name, playbook_domain, trigger_finding_type, action_sequence, expected_metric, success_threshold)
        VALUES 
        (?, 'Recuperação de Cotação Fria', 'CONVERSION', 'low_quote_to_order_rate', '{"steps":[{"action":"trigger_followup_sequence","delay_minutes":0},{"action":"adjust_quote_margin","delay_minutes":120}]}', 'quote_to_order_rate', 0.15),
        (?, 'Incentivo de Abandono de Carrinho', 'CONVERSION', 'checkout_dropoff_high', '{"steps":[{"action":"adjust_checkout_incentive","delay_minutes":0}]}', 'checkout_completion_rate', 0.35),
        (?, 'Reativação Direta', 'RETENTION', 'repeat_order_low', '{"steps":[{"action":"trigger_reactivation_sequence","delay_minutes":0}]}', 'repeat_orders_total', 1)
      `, [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]);
            console.log('  ✅ Seeded initial playbooks.');
        }

        console.log('✅ supreme_playbooks table created/verified.\n🎉 Migration 0054 applied.');
    } finally { conn.release(); await pool.end(); }
}
run().catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1); });
