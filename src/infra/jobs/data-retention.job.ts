import { getDb } from '@/infra/db';
import { sql } from 'drizzle-orm';
import { structuredLogger } from '@/infra/log/logger';

/**
 * LGPD Data Retention Purge Job
 *
 * Scans tables with `purge_at` column and deletes records
 * where purge_at <= NOW(). Processes in batches to avoid
 * long-running transactions.
 *
 * Protected tables (NEVER purged):
 * - tenants, users, tenant_budgets (critical)
 * - billing_ledger, tenant_subscriptions (billing)
 * - admin_audit_log (audit trail)
 */

const BATCH_SIZE = 500;
const MAX_RECORDS_PER_RUN = 10_000;

// Tables with purge_at column — Central do Comprador (Customer Central)
const PURGEABLE_TABLES = [
    'organizations',
    'sites',
    'customer_accounts',
    'customer_timeline_events',
    'delivery_proofs',
    'invoices',
] as const;

export interface PurgeResult {
    table: string;
    deleted: number;
}

export interface DataRetentionReport {
    recordsScanned: number;
    recordsPurged: number;
    durationMs: number;
    tables: PurgeResult[];
    reachedLimit: boolean;
}

/**
 * Run the LGPD data retention purge.
 *
 * For each purgeable table, deletes rows where purge_at <= NOW()
 * in batches of BATCH_SIZE, up to MAX_RECORDS_PER_RUN total.
 */
export async function runDataRetentionPurge(opts: {
    requestId: string;
    maxRecords?: number;
}): Promise<DataRetentionReport> {
    const startedAt = Date.now();
    const maxRecords = opts.maxRecords ?? MAX_RECORDS_PER_RUN;
    const db = await getDb();

    let totalScanned = 0;
    let totalPurged = 0;
    let reachedLimit = false;
    const tableResults: PurgeResult[] = [];

    for (const table of PURGEABLE_TABLES) {
        if (totalPurged >= maxRecords) {
            reachedLimit = true;
            break;
        }

        let tableDeleted = 0;

        // Count eligible rows first
        const [countResult] = await db.execute(
            sql.raw(`SELECT COUNT(*) as cnt FROM \`${table}\` WHERE purge_at IS NOT NULL AND purge_at <= NOW()`)
        );
        const eligible = Number((countResult as any)[0]?.cnt ?? 0);
        totalScanned += eligible;

        if (eligible === 0) {
            tableResults.push({ table, deleted: 0 });
            continue;
        }

        structuredLogger.info('data_retention_purge_table_start', {
            requestId: opts.requestId,
            eventType: 'lgpd_purge',
            table,
            eligible,
        });

        // Delete in batches
        while (tableDeleted < eligible && totalPurged < maxRecords) {
            const batchLimit = Math.min(BATCH_SIZE, maxRecords - totalPurged);

            const [deleteResult] = await db.execute(
                sql.raw(
                    `DELETE FROM \`${table}\` WHERE purge_at IS NOT NULL AND purge_at <= NOW() LIMIT ${batchLimit}`
                )
            );

            const affectedRows = Number((deleteResult as any)?.affectedRows ?? 0);

            if (affectedRows === 0) break;

            tableDeleted += affectedRows;
            totalPurged += affectedRows;
        }

        structuredLogger.info('data_retention_purge_table_done', {
            requestId: opts.requestId,
            eventType: 'lgpd_purge',
            table,
            deleted: tableDeleted,
        });

        tableResults.push({ table, deleted: tableDeleted });
    }

    const durationMs = Date.now() - startedAt;

    structuredLogger.info('data_retention_purge_complete', {
        requestId: opts.requestId,
        eventType: 'lgpd_purge',
        recordsScanned: totalScanned,
        recordsPurged: totalPurged,
        durationMs,
        reachedLimit,
    });

    return {
        recordsScanned: totalScanned,
        recordsPurged: totalPurged,
        durationMs,
        tables: tableResults,
        reachedLimit,
    };
}
