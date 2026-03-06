import { sql } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { redisClient } from '@/infra/redis.client';
import { structuredLogger } from '@/infra/log/logger';
import {
    tenants,
    users,
    adminAuditLog,
    securityIncidents,
} from '@/drizzle/schema';
import fs from 'fs';
import path from 'path';

export interface RecoveryCheckResult {
    status: 'PASS' | 'WARN' | 'FAIL';
    db_connection_ok: boolean;
    redis_connection_ok: boolean;
    critical_tables_present: boolean;
    table_count_ok: boolean;
    migrations_in_sync: boolean;
    latest_migration_id: number | null;
    basic_reads_ok: boolean;
    details: Record<string, string | number | boolean | null>;
}

const CRITICAL_TABLES = [
    'tenants',
    'users',
    'admin_audit_log',
    'security_incidents',
    'security_edge_events',
    'idempotency_requests',
];

const MIN_TABLE_COUNT = 30;

export async function runRecoveryIntegrityChecks(): Promise<RecoveryCheckResult> {
    const requestId = `recovery-${Date.now()}`;
    const details: RecoveryCheckResult['details'] = {};

    structuredLogger.info('recovery_check_started', {
        requestId,
        eventType: 'recovery_check_started',
    });

    const result: RecoveryCheckResult = {
        status: 'PASS',
        db_connection_ok: false,
        redis_connection_ok: false,
        critical_tables_present: false,
        table_count_ok: false,
        migrations_in_sync: false,
        latest_migration_id: null,
        basic_reads_ok: false,
        details,
    };

    // ── 1. DB connection ────────────────────────────────────────────────────────
    try {
        const db = await getDb();
        await db.execute(sql`SELECT 1`);
        result.db_connection_ok = true;
        details['db_ping'] = 'ok';
    } catch (err: any) {
        details['db_ping'] = err?.message ?? 'error';
        result.status = 'FAIL';
    }

    // ── 2. Redis connection ─────────────────────────────────────────────────────
    try {
        const pong = await redisClient.ping();
        result.redis_connection_ok = Boolean(pong);
        details['redis_ping'] = pong ? 'ok' : 'no-response';
        if (!pong) result.status = result.status === 'FAIL' ? 'FAIL' : 'WARN';
    } catch (err: any) {
        details['redis_ping'] = err?.message ?? 'error';
        result.status = result.status === 'FAIL' ? 'FAIL' : 'WARN';
    }

    // ── 3. Critical tables + table count ───────────────────────────────────────
    if (result.db_connection_ok) {
        try {
            const db = await getDb();
            const rows = await db.execute<{ TABLE_NAME: string }>(
                sql`SELECT TABLE_NAME FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
             ORDER BY TABLE_NAME`
            );
            const tableNames = rows.map((r: any) => r.TABLE_NAME ?? r.table_name).filter(Boolean);
            details['table_count'] = tableNames.length;

            result.table_count_ok = tableNames.length >= MIN_TABLE_COUNT;
            if (!result.table_count_ok) result.status = 'FAIL';

            const missing = CRITICAL_TABLES.filter(t => !tableNames.includes(t));
            result.critical_tables_present = missing.length === 0;
            details['missing_critical_tables'] = missing.join(', ') || 'none';
            if (!result.critical_tables_present) result.status = 'FAIL';
        } catch (err: any) {
            details['table_check'] = err?.message ?? 'error';
            result.status = 'FAIL';
        }

        // ── 4. Basic reads ───────────────────────────────────────────────────────
        try {
            const db = await getDb();
            const [tenantRows, userRows, auditRows, incidentRows] = await Promise.all([
                db.select({ id: tenants.id }).from(tenants).limit(1),
                db.select({ id: users.id }).from(users).limit(1),
                db.select({ id: adminAuditLog.id }).from(adminAuditLog).limit(1),
                db.select({ id: securityIncidents.id }).from(securityIncidents).limit(1),
            ]);
            result.basic_reads_ok = true;
            details['tenants_readable'] = true;
            details['users_readable'] = true;
            details['admin_audit_log_readable'] = true;
            details['security_incidents_readable'] = true;
            void tenantRows; void userRows; void auditRows; void incidentRows;
        } catch (err: any) {
            details['basic_reads'] = err?.message ?? 'error';
            result.status = 'FAIL';
        }
    }

    // ── 5. Migration journal ────────────────────────────────────────────────────
    try {
        const journalPath = path.resolve('./drizzle/meta/_journal.json');
        if (fs.existsSync(journalPath)) {
            const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
            const entries: Array<{ idx: number }> = journal.entries || [];
            const lastEntry = entries[entries.length - 1];
            result.latest_migration_id = lastEntry?.idx ?? null;
            result.migrations_in_sync = entries.length > 0;
            details['journal_entries'] = entries.length;
            details['last_migration_tag'] = lastEntry?.idx ?? 'none';
        } else {
            details['journal'] = 'not-found';
            result.status = 'FAIL';
        }
    } catch (err: any) {
        details['journal'] = err?.message ?? 'error';
        result.status = 'FAIL';
    }

    // ── Final status ────────────────────────────────────────────────────────────
    const eventName =
        result.status === 'PASS' ? 'recovery_check_passed' : 'recovery_check_failed';

    structuredLogger[result.status === 'PASS' ? 'info' : 'warn'](eventName, {
        requestId,
        eventType: eventName,
        status: result.status,
        db_connection_ok: result.db_connection_ok,
        redis_connection_ok: result.redis_connection_ok,
        critical_tables_present: result.critical_tables_present,
        migrations_in_sync: result.migrations_in_sync,
        latest_migration_id: result.latest_migration_id,
    });

    return result;
}
