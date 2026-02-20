import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    console.log('Connecting to database...');
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('No DB URL');

    const pool = mysql.createPool({
        uri: dbUrl,
        ssl: { rejectUnauthorized: true },
    });

    try {
        console.log('Creating users table if not exists...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS \`users\` (
                \`id\` varchar(36) NOT NULL,
                \`email\` varchar(255) NOT NULL,
                \`password_hash\` varchar(512) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`role\` varchar(20) NOT NULL DEFAULT 'operator',
                \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`idx_user_email\` (\`email\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log('Creating project_reports table if not exists...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS \`project_reports\` (
                \`id\` varchar(36) NOT NULL,
                \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`module_key\` varchar(100) NOT NULL,
                \`title\` varchar(255) NOT NULL,
                \`summary\` text NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'done',
                \`changes\` text,
                \`metrics\` text,
                \`risks\` text,
                \`next_actions\` text,
                \`tags\` text,
                \`source\` varchar(20) NOT NULL DEFAULT 'manual',
                \`content_hash\` varchar(64) NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`idx_report_hash\` (\`content_hash\`),
                KEY \`idx_report_module\` (\`module_key\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Success!');
    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        await pool.end();
    }
}

run();
