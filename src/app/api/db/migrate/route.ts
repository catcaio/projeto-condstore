import { NextResponse, NextRequest } from "next/server";
import mysql from "mysql2/promise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// All migrations as inline SQL — avoids filesystem dependency in Vercel serverless
const MIGRATIONS = [
    {
        name: "0000_simulations_hardening",
        sql: [
            "ALTER TABLE `simulations` ADD COLUMN IF NOT EXISTS `idempotency_key` varchar(255)",
            "ALTER TABLE `simulations` ADD COLUMN IF NOT EXISTS `event` varchar(50) NOT NULL DEFAULT 'FREIGHT_QUOTED'",
            "CREATE UNIQUE INDEX IF NOT EXISTS `simulations_idempotency_key_unique` ON `simulations` (`idempotency_key`)",
        ],
    },
    {
        name: "create_users_table",
        sql: [
            `CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` varchar(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`password_hash\` varchar(512) NOT NULL,
        \`tenant_id\` varchar(36) NOT NULL,
        \`role\` varchar(20) NOT NULL DEFAULT 'operator',
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_user_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        ],
    },
    {
        name: "create_project_reports_table",
        sql: [
            `CREATE TABLE IF NOT EXISTS \`project_reports\` (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        ],
    },
    {
        name: "create_freight_funnel_events",
        sql: [
            `CREATE TABLE IF NOT EXISTS \`freight_funnel_events\` (
        \`id\` varchar(36) NOT NULL,
        \`session_id\` varchar(255) NOT NULL,
        \`tenant_id\` varchar(36) NOT NULL,
        \`stage\` varchar(50) NOT NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_funnel_session\` (\`session_id\`),
        KEY \`idx_funnel_tenant\` (\`tenant_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        ],
    },
];

async function handler(request: NextRequest) {
    try {
        const token = request.headers.get('x-seed-token');

        if (!token || token !== process.env.SEED_TOKEN) {
            return NextResponse.json({ success: false, error: 'Unauthorized: missing or invalid seed token' }, { status: 401 });
        }

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return NextResponse.json({ success: false, error: 'DATABASE_URL missing' }, { status: 500 });
        }

        const urlObj = new URL(dbUrl);
        console.log(`[/api/db/migrate] DB: host=${urlObj.hostname}, db=${urlObj.pathname.replace('/', '')}`);

        const connection = await mysql.createConnection({
            uri: dbUrl,
            ssl: { rejectUnauthorized: true }
        });

        const applied: string[] = [];
        const errors: string[] = [];

        for (const migration of MIGRATIONS) {
            for (const stmt of migration.sql) {
                try {
                    await connection.execute(stmt);
                    applied.push(migration.name);
                } catch (e: any) {
                    console.error(`[migrate] Failed ${migration.name}:`, e.message);
                    errors.push(`${migration.name}: ${e.message}`);
                }
            }
        }

        await connection.end();

        return NextResponse.json({
            success: errors.length === 0,
            applied: [...new Set(applied)].length,
            migrations: [...new Set(applied)],
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err: any) {
        console.error("[/api/db/migrate] error", err);
        return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    return handler(request);
}

export async function GET(request: NextRequest) {
    return handler(request);
}
