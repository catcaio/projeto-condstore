import { NextResponse, NextRequest } from "next/server";
import mysql from "mysql2/promise";
import { isInternalTokenAuthorized } from '@/infra/config/internal-token';
import { logger } from '@/infra/logger';

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
    {
        name: "create_tenant_ai_providers_table",
        sql: [
            `CREATE TABLE IF NOT EXISTS \`tenant_ai_providers\` (
        \`id\` varchar(36) NOT NULL,
        \`tenant_id\` varchar(36) NOT NULL,
        \`provider_type\` varchar(30) NOT NULL,
        \`base_url\` varchar(255) NOT NULL,
        \`model\` varchar(255) NOT NULL,
        \`embed_model\` varchar(255) NOT NULL,
        \`api_key\` varchar(512) DEFAULT NULL,
        \`timeout_ms\` int NOT NULL DEFAULT 20000,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_tenant_ai_providers_tenant_id\` (\`tenant_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        ],
    },
    {
        name: "alter_tenant_ai_providers_v2",
        sql: [
            "ALTER TABLE `tenant_ai_providers` ADD COLUMN IF NOT EXISTS `api_key_encrypted` varchar(512) DEFAULT NULL",
            "ALTER TABLE `tenant_ai_providers` ADD COLUMN IF NOT EXISTS `is_enabled` int NOT NULL DEFAULT 1",
            "ALTER TABLE `tenant_ai_providers` ADD COLUMN IF NOT EXISTS `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        ],
    },
    {
        name: "cleanup_plaintext_api_keys",
        sql: [
            "UPDATE `tenant_ai_providers` SET `api_key` = NULL WHERE `api_key_encrypted` IS NOT NULL AND `api_key_encrypted` <> '' AND `api_key` IS NOT NULL",
        ],
    },
    {
        name: "frank_events_dataset_consistency",
        sql: [
            "ALTER TABLE `frank_events` ADD COLUMN IF NOT EXISTS `rag_used` int NOT NULL DEFAULT 0",
            "ALTER TABLE `frank_events` ADD COLUMN IF NOT EXISTS `rag_chunks` int NOT NULL DEFAULT 0",
            "ALTER TABLE `frank_events` ADD COLUMN IF NOT EXISTS `rag_latency_ms` int NOT NULL DEFAULT 0",
            "UPDATE `frank_events` SET `tokens_prompt` = 0 WHERE `tokens_prompt` IS NULL",
            "UPDATE `frank_events` SET `tokens_completion` = 0 WHERE `tokens_completion` IS NULL",
            "UPDATE `frank_events` SET `rag_used` = 0 WHERE `rag_used` IS NULL",
            "UPDATE `frank_events` SET `rag_chunks` = 0 WHERE `rag_chunks` IS NULL",
            "UPDATE `frank_events` SET `rag_latency_ms` = 0 WHERE `rag_latency_ms` IS NULL",
            "ALTER TABLE `frank_events` MODIFY COLUMN `tokens_prompt` int NOT NULL DEFAULT 0",
            "ALTER TABLE `frank_events` MODIFY COLUMN `tokens_completion` int NOT NULL DEFAULT 0",
        ],
    },
];

async function handler(request: NextRequest) {
    try {
        const token = request.headers.get('x-internal-token');

        if (!isInternalTokenAuthorized(token)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return NextResponse.json({ success: false, error: 'DATABASE_URL missing' }, { status: 500 });
        }

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
                    logger.warn('db_migrate.statement_failed', {
                        migration: migration.name,
                        code: e?.code,
                    });
                    errors.push(`${migration.name}: failed`);
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
        logger.error('db_migrate.failed', err as Error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    return handler(request);
}

export async function GET(request: NextRequest) {
    void request;
    return NextResponse.json(
        { success: false, error: 'Method Not Allowed' },
        { status: 405, headers: { Allow: 'POST' } },
    );
}
