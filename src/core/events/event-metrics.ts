/**
 * event-metrics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilitários de observabilidade para Redis Streams.
 *
 * getStreamLag  → XPENDING + XINFO para backlog do consumer group
 * getDLQCount   → XLEN do stream:dlq
 *
 * Projetado para ser chamado de endpoints internos (/api/internal/events/metrics)
 * sem side-effects — apenas leitura.
 */

import { redisClient } from '../../infra/redis.client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface StreamLagResult {
    stream: string;
    group: string;
    /** Número de mensagens pendentes (entregues mas não ACKadas) */
    pending: number;
    /** Número total de mensagens no stream */
    streamLength: number;
    /** Mensagens que nunca foram entregues (backlog real) */
    undelivered: number;
    /** Timestamp da msg mais antiga pendente (ISO 8601 ou null) */
    oldestPendingId: string | null;
    /** Consumers ativos no grupo */
    consumerCount: number;
    /** Timestamp da coleta */
    collectedAt: string;
}

export interface DLQCountResult {
    stream: string;
    dlqStream: string;
    dlqCount: number;
    collectedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extrai o timestamp Unix (ms) de um Redis Stream ID (ex: "1706000000000-0"). */
function streamIdToMs(id: string): number {
    return parseInt(id.split('-')[0], 10);
}

/** Converte ms Unix em ISO 8601. Retorna null se inválido. */
function msToIso(ms: number): string | null {
    if (!ms || isNaN(ms)) return null;
    return new Date(ms).toISOString();
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Retorna métricas de lag do consumer group em um stream.
 *
 * Usa XPENDING (summary) para pending count + oldest ID,
 * e XINFO GROUPS para consumerCount.
 * XLEN para comprimento total do stream.
 *
 * Retorna null se Redis indisponível ou stream/group não existirem.
 */
export async function getStreamLag(
    stream: string,
    group: string
): Promise<StreamLagResult | null> {
    const redis = redisClient.getRawClient();
    if (!redis) return null;

    const collectedAt = new Date().toISOString();

    try {
        // XPENDING <stream> <group> — summary mode (5 fields)
        // Returns: [count, minId, maxId, consumers[]]
        const pending: any = await redis.xpending(stream, group);
        const pendingCount: number = pending?.[0] ?? 0;
        const oldestRawId: string | null = pending?.[1] ?? null;

        // XLEN <stream>
        const streamLength = await redis.xlen(stream);

        // XINFO GROUPS <stream>
        const groupInfoRaw: any[] = await (redis as any).xinfo('GROUPS', stream);

        let consumerCount = 0;
        let undelivered = 0;

        // groupInfoRaw is a flat array: [key, value, key, value, ...]
        // We need to find our group
        for (let i = 0; i < groupInfoRaw.length; i++) {
            const item = groupInfoRaw[i];
            // ioredis may return array-of-arrays or flat depending on version
            const fields: string[] = Array.isArray(item) ? item : groupInfoRaw;
            const nameIdx = fields.indexOf('name');
            if (nameIdx === -1) break;
            const groupName = fields[nameIdx + 1];
            if (groupName !== group) {
                if (!Array.isArray(item)) break; // flat array, already checked
                continue;
            }
            const consumersIdx = fields.indexOf('consumers');
            consumerCount = consumersIdx !== -1 ? (fields[consumersIdx + 1] as any) : 0;

            const pendingIdx = fields.indexOf('pending');
            const pendingInGroup = pendingIdx !== -1 ? (fields[pendingIdx + 1] as any) : 0;

            // undelivered = total - pending (approximate)
            undelivered = Math.max(0, streamLength - pendingInGroup);
            break;
        }

        return {
            stream,
            group,
            pending: pendingCount,
            streamLength,
            undelivered,
            oldestPendingId: oldestRawId
                ? (msToIso(streamIdToMs(oldestRawId)) ?? oldestRawId)
                : null,
            consumerCount,
            collectedAt,
        };
    } catch (err: any) {
        // Stream or group may not exist yet — return zeroed result
        if (
            err?.message?.includes('ERR no such key') ||
            err?.message?.includes('NOGROUP')
        ) {
            return {
                stream,
                group,
                pending: 0,
                streamLength: 0,
                undelivered: 0,
                oldestPendingId: null,
                consumerCount: 0,
                collectedAt,
            };
        }
        throw err;
    }
}

/**
 * Retorna a contagem de mensagens no DLQ (Dead Letter Queue) de um stream.
 * Convenção: DLQ = `${stream}:dlq`
 */
export async function getDLQCount(stream: string): Promise<DLQCountResult | null> {
    const redis = redisClient.getRawClient();
    if (!redis) return null;

    const dlqStream = `${stream}:dlq`;
    const collectedAt = new Date().toISOString();

    try {
        const dlqCount = await redis.xlen(dlqStream);
        return { stream, dlqStream, dlqCount, collectedAt };
    } catch {
        return { stream, dlqStream, dlqCount: 0, collectedAt };
    }
}
