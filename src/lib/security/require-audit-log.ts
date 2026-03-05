import crypto from 'node:crypto';
import { getDb } from '../../infra/db';
import { adminAuditLog } from '../../drizzle/schema';
import { structuredLogger as logger } from '../../infra/log/logger';

export type ActorType = 'user' | 'internal' | 'system';

export interface WriteAuditLogParams {
    tenantId?: string | null;
    userId?: string | null;
    actorType: ActorType;
    action: string;
    scope: string;
    requestId: string;
    payload?: unknown;
    metadata?: Record<string, unknown> | null;
}

/**
 * Compute a SHA-256 hash of the normalized (sorted-key JSON) payload.
 * Never stores raw payload — only the hash for tamper-detection.
 */
export function hashPayload(payload: unknown): string {
    const normalized = JSON.stringify(payload, Object.keys(payload as any ?? {}).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Writes an audit log entry. **Throws on failure** (fail-closed).
 *
 * If the insert fails, the caller MUST treat the operation as failed
 * and return a 503 to the client.
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
    const payloadHash = params.payload != null ? hashPayload(params.payload) : null;

    const db = await getDb();
    await db.insert(adminAuditLog).values({
        id: crypto.randomUUID(),
        tenantId: params.tenantId ?? null,
        userId: params.userId ?? null,
        actorType: params.actorType,
        action: params.action,
        scope: params.scope,
        requestId: params.requestId,
        payloadHash,
        metadata: params.metadata ?? null,
    });

    logger.info('audit_log_written', {
        action: params.action,
        scope: params.scope,
        requestId: params.requestId,
        actorType: params.actorType,
    });
}
