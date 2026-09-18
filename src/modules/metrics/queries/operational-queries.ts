/**
 * Query oficial das métricas operacionais do dia (issue #396).
 *
 * Única fonte reutilizável para `GET /api/cockpit/metrics`. A rota é
 * apresentação (auth/cache/logs) e não recalcula KPIs.
 */

import { sql, eq, and, gte, or, like } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { logger } from '@/infra/logger';
import { orders, operationalEvents, simulations } from '@/drizzle/schema';
import { messageRepository } from '@/infra/repositories/message.repository';
import { simulationRepository } from '@/infra/repositories/simulation.repository';
import {
    buildAttributionBreakdown,
    isAttributionGroupBy,
    parseAttributionGroupBy,
    unwrapRows,
} from '../attribution-breakdown';
import type { AttributionGroupBy } from '@/infra/attribution/attribution.types';

export interface OperationalMetrics {
    mensagensHoje: number;
    cotacoesHoje: number;
    pedidosHoje: number;
    erros24h: number;
    tempoMedioRespostaMin: number | null;
    tempoMedioCotacaoMin: number | null;
    handoffsHoje: number;
    conversaoCotacaoPedido: number | null;
    attribution_breakdown_7d?: {
        groupBy: 'utm_source' | 'utm_campaign';
        buckets: Array<{ key: string; count: number }>;
    };
}

function requireTenant(tenantId: string): void {
    if (!tenantId || tenantId.trim() === '') {
        throw new Error('tenant_id is required');
    }
}

/** Query oficial `ops.*` — todas as leituras filtram por `tenantId`. */
export async function getOperationalMetrics(
    tenantId: string,
    groupByInput?: string | null,
): Promise<OperationalMetrics> {
    requireTenant(tenantId);
    const parsedGroupBy = parseAttributionGroupBy(groupByInput ?? null);
    const groupBy: AttributionGroupBy | null = isAttributionGroupBy(parsedGroupBy) ? parsedGroupBy : null;

    const [
        msgMetrics,
        cotacoesHoje,
        attributionBreakdownResult,
        pedidosResult,
        errosResult,
        handoffsResult,
        timingsResult,
        conversion7dResult,
    ] = await Promise.all([
        messageRepository.getMetricsToday(tenantId),
        simulationRepository.countToday(tenantId),
        groupBy
            ? (async () => {
                const db = await getDb();
                // attribution breakdown comes from attribution_clicks table, not public_events
                try {
                    return await db.execute(
                        groupBy === 'utm_campaign'
                            ? sql`
                    SELECT COALESCE(NULLIF(utm_campaign, ''), '(none)') AS bucket, COUNT(*) AS count
                    FROM attribution_clicks
                    WHERE tenant_id = ${tenantId}
                      AND created_at >= NOW() - INTERVAL 7 DAY
                    GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
                    ORDER BY count DESC, bucket ASC
                  `
                            : sql`
                    SELECT COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket, COUNT(*) AS count
                    FROM attribution_clicks
                    WHERE tenant_id = ${tenantId}
                      AND created_at >= NOW() - INTERVAL 7 DAY
                    GROUP BY COALESCE(NULLIF(utm_source, ''), '(none)')
                    ORDER BY count DESC, bucket ASC
                  `,
                    );
                } catch (err) {
                    logger.error('Failed to load attribution breakdown', err as Error, { tenantId, groupBy });
                    return null;
                }
            })()
            : Promise.resolve(null),
        // pedidosHoje: orders created today for this tenant
        (async () => {
            const db = await getDb();
            const rows = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(orders)
                .where(
                    and(
                        eq(orders.tenantId, tenantId),
                        gte(orders.createdAt, sql`CURDATE()`),
                    ),
                );
            return rows[0]?.count ?? 0;
        })(),
        // erros24h: operational_events with error/failed event types in last 24h
        (async () => {
            const db = await getDb();
            const rows = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(operationalEvents)
                .where(
                    and(
                        eq(operationalEvents.tenantId, tenantId),
                        gte(operationalEvents.createdAt, sql`NOW() - INTERVAL 24 HOUR`),
                        or(
                            like(operationalEvents.eventType, '%FAILED%'),
                            like(operationalEvents.eventType, '%ERROR%'),
                        ),
                    ),
                );
            return rows[0]?.count ?? 0;
        })(),
        // handoffsHoje
        (async () => {
            const db = await getDb();
            const rows = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(operationalEvents)
                .where(
                    and(
                        eq(operationalEvents.tenantId, tenantId),
                        gte(operationalEvents.createdAt, sql`CURDATE()`),
                        eq(operationalEvents.eventType, 'frank_assist_handoff'),
                    ),
                );
            return rows[0]?.count ?? 0;
        })(),
        // timings (avg response and quote time)
        (async () => {
            const db = await getDb();
            const sevenDaysAgo = sql`DATE_SUB(NOW(), INTERVAL 7 DAY)`;
            const result = await db.execute(sql`
          WITH FirstInbound AS (
              SELECT conversation_id, MIN(created_at) as first_in
              FROM conversation_messages
              WHERE tenant_id = ${tenantId}
                AND direction = 'inbound'
                AND created_at >= ${sevenDaysAgo}
              GROUP BY conversation_id
          ),
          FirstOutboundHuman AS (
              SELECT conversation_id, MIN(created_at) as first_out_human
              FROM conversation_messages
              WHERE tenant_id = ${tenantId}
                AND direction = 'outbound'
                AND source = 'OPERATOR'
                AND created_at >= ${sevenDaysAgo}
              GROUP BY conversation_id
          ),
          FirstQuote AS (
              SELECT conversation_id, MIN(created_at) as first_quote
              FROM simulations
              WHERE tenant_id = ${tenantId}
                AND created_at >= ${sevenDaysAgo}
              GROUP BY conversation_id
          )
          SELECT
              AVG(TIMESTAMPDIFF(SECOND, i.first_in, h.first_out_human)) as avgFirstResponseSec,
              AVG(TIMESTAMPDIFF(SECOND, i.first_in, q.first_quote)) as avgFirstQuoteSec
          FROM FirstInbound i
          LEFT JOIN FirstOutboundHuman h ON i.conversation_id = h.conversation_id AND h.first_out_human > i.first_in
          LEFT JOIN FirstQuote q ON i.conversation_id = q.conversation_id AND q.first_quote > i.first_in
        `);
            const rows = unwrapRows<{ avgFirstResponseSec: number | string | null; avgFirstQuoteSec: number | string | null }>(result);
            return rows[0] || { avgFirstResponseSec: null, avgFirstQuoteSec: null };
        })(),
        // conversionQuoteToOrder (7 days)
        (async () => {
            const db = await getDb();
            const sevenDaysAgo = sql`DATE_SUB(NOW(), INTERVAL 7 DAY)`;
            const [q] = await db.select({ count: sql<number>`COUNT(*)` }).from(simulations).where(and(eq(simulations.tenantId, tenantId), gte(simulations.createdAt, sevenDaysAgo)));
            const [o] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, sevenDaysAgo)));
            const quotes = Number(q?.count ?? 0);
            const ordersCount = Number(o?.count ?? 0);
            return quotes > 0 ? (ordersCount / quotes) * 100 : 0;
        })(),
    ]);

    const payload: OperationalMetrics = {
        mensagensHoje: Number(msgMetrics.total ?? 0),
        cotacoesHoje: Number(cotacoesHoje ?? 0),
        pedidosHoje: Number(pedidosResult),
        erros24h: Number(errosResult),
        tempoMedioRespostaMin: timingsResult.avgFirstResponseSec !== null ? Number(timingsResult.avgFirstResponseSec) / 60 : null,
        tempoMedioCotacaoMin: timingsResult.avgFirstQuoteSec !== null ? Number(timingsResult.avgFirstQuoteSec) / 60 : null,
        handoffsHoje: Number(handoffsResult),
        conversaoCotacaoPedido: Number(conversion7dResult),
    };

    if (groupBy && attributionBreakdownResult) {
        payload.attribution_breakdown_7d = buildAttributionBreakdown(
            groupBy,
            unwrapRows<{ bucket: string | null; count: number | string | null }>(attributionBreakdownResult),
        );
    }

    return payload;
}
