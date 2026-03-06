export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { makeRequestId, attachRequestIdHeader } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { getDb } from '@/infra/db';
import { redisClient } from '@/infra/redis.client';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

interface RecoveryDiagPayload {
    db_connection_ok: boolean;
    redis_connection_ok: boolean;
    migrations_in_sync: boolean;
    latest_migration_id: number | null;
    backup_envs_present: boolean;
    restore_check_ready: boolean;
}

function checkBackupEnvs(): boolean {
    const required = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
    ];
    const redisPresent = Boolean(
        process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
    );
    const tokenPresent = Boolean(
        process.env.INTERNAL_DIAG_TOKEN ||
        process.env.INTERNAL_EXPORT_TOKEN ||
        process.env.INTERNAL_JOB_TOKEN
    );
    return required.every(k => Boolean(process.env[k])) && redisPresent && tokenPresent;
}

function readLatestMigrationId(): { inSync: boolean; latestId: number | null } {
    try {
        const journalPath = path.resolve('./drizzle/meta/_journal.json');
        if (!fs.existsSync(journalPath)) return { inSync: false, latestId: null };
        const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
        const entries: Array<{ idx: number }> = journal.entries ?? [];
        if (entries.length === 0) return { inSync: false, latestId: null };
        return { inSync: true, latestId: entries[entries.length - 1].idx };
    } catch {
        return { inSync: false, latestId: null };
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const startedAt = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/internal/diag/recovery';

    const authResult = requireInternalToken(request, { purpose: ['diag'] });
    if (!authResult.ok) return authResult.response;

    structuredLogger.info('recovery_diag_start', {
        requestId,
        route,
        eventType: 'recovery_diag_start',
    });

    try {
        // DB check
        let dbOk = false;
        try {
            const db = await getDb();
            await db.execute(sql`SELECT 1`);
            dbOk = true;
        } catch (err) {
            structuredLogger.warn('recovery_diag_db_fail', {
                requestId, route, error: err, errorCode: ErrorCode.DB_ERROR,
            });
        }

        // Redis check
        let redisOk = false;
        try {
            const pong = await redisClient.ping();
            redisOk = Boolean(pong);
        } catch (err) {
            structuredLogger.warn('recovery_diag_redis_fail', {
                requestId, route, error: err, errorCode: ErrorCode.UNKNOWN,
            });
        }

        // Migration journal
        const { inSync, latestId } = readLatestMigrationId();

        // Env check
        const backupEnvsPresent = checkBackupEnvs();

        const restoreCheckReady =
            dbOk && redisOk && inSync && backupEnvsPresent;

        const payload: RecoveryDiagPayload = {
            db_connection_ok: dbOk,
            redis_connection_ok: redisOk,
            migrations_in_sync: inSync,
            latest_migration_id: latestId,
            backup_envs_present: backupEnvsPresent,
            restore_check_ready: restoreCheckReady,
        };

        structuredLogger.info('recovery_diag_end', {
            requestId,
            route,
            eventType: 'recovery_diag_end',
            durationMs: Date.now() - startedAt,
            restore_check_ready: restoreCheckReady,
        });

        const response = NextResponse.json(payload, { status: 200 });
        attachRequestIdHeader(response, requestId);
        return response;
    } catch (error) {
        structuredLogger.error('recovery_diag_unhandled', {
            requestId, route, error, errorCode: ErrorCode.UNKNOWN,
            durationMs: Date.now() - startedAt,
        });
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Recovery diagnostics failed');
    }
}
