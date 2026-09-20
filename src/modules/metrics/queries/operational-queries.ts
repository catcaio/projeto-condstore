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
    getRollingWindowStart,
    getStartOfDayInMetricsTimezone,
} from '../timezone';
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

/**
 * Query oficial `ops.*` — todas as leituras filtram por `tenantId`.
 *
 * Contrato temporal: fronteiras calculadas em app a partir de um único `now`
 * (dia-calendário em America/Sao_Paulo; janelas móveis como instantes
 * absolutos). O SQL nunca usa NOW()/CURDATE().
 */
export async function getOperationalMetrics(
    tenantId: string,
    groupByInput?: string | null,
    now: Date = new Date(),
): Promise<OperationalMetrics> {
    requireTenant(tenantId);
    const parsedGroupBy = parseAttributionGroupBy(groupByInput ?? null);
    const groupBy: AttributionGroupBy | null = isAttributionGroupBy(parsedGroupBy) ? parsedGroupBy : null;

    const startOfToday = getStartOfDayInMetricsTimezone(now);
    const last24h = getRollingWindowStart(now, 1);
    const last7d = getRollingWindowStart(now, 7);

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
                      AND created_at >= ${last7d}
                    GROUP BY COALESCE(NULLIF(utm_campaign, ''), '(none)')
                    ORDER BY count DESC, bucket ASC
                  `
                            : sql`
                    SELECT COALESCE(NULLIF(utm_source, ''), '(none)') AS bucket, COUNT(*) AS count
                    FROM attribution_clicks
                    WHERE tenant_id = ${tenantId}
                      AND created_at >= ${last7d}
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
        // pedidosHoje: orders criados a partir da meia-noite SP (contrato canônico).
        (async () => {
            const db = await getDb();
            const rows = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(orders)
                .where(
                    and(
                        eq(orders.tenantId, tenantId),
                        gte(orders.createdAt, startOfToday),
                    ),
                );
            return rows[0]?.count ?? 0;
        })(),
        // erros24h: operational_events com tipos error/failed na janela móvel de 24h.
        (async () => {
            const db = await getDb();
            const rows = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(operationalEvents)
                .where(
                    and(
                        eq(operationalEvents.tenantId, tenantId),
                        gte(operationalEvents.createdAt, last24h),
                        or(
                            like(operationalEvents.eventType, '%FAILED%'),
                            like(operationalEvents.eventType, '%ERROR%'),
                        ),
                    ),
                );
            return rows[0]?.count ?? 0;
        })(),
        // handoffsHoje: handoffs a partir da meia-noite SP (contrato canônico).
        (async () => {
            const db = await getDb();
            const rows = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(operationalEvents)
                .where(
                    and(
                        eq(operationalEvents.tenantId, tenantId),
                        gte(operationalEvents.createdAt, startOfToday),
                        eq(operationalEvents.eventType, 'frank_assist_handoff'),
                    ),
                );
            return rows[0]?.count ?? 0;
        })(),
        // timings (avg response and quote time, janela móvel de 7 dias)
        (async () => {
            const db = await getDb();
            const result = await db.execute(sql`
          WITH FirstInbound AS (
              SELECT conversation_id, MIN(created_at) as first_in
              FROM conversation_messages
              WHERE tenant_id = ${tenantId}
                AND direction = 'inbound'
                AND created_at >= ${last7d}
              GROUP BY conversation_id
          ),
          FirstOutboundHuman AS (
              SELECT conversation_id, MIN(created_at) as first_out_human
              FROM conversation_messages
              WHERE tenant_id = ${tenantId}
                AND direction = 'outbound'
                AND source = 'OPERATOR'
                AND created_at >= ${last7d}
              GROUP BY conversation_id
          ),
          FirstQuote AS (
              SELECT conversation_id, MIN(created_at) as first_quote
              FROM simulations
              WHERE tenant_id = ${tenantId}
                AND created_at >= ${last7d}
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
        // conversionQuoteToOrder (coorte 7d): fração das cotações criadas na
        // janela que atingiram status CONVERTED — i.e., geraram pedido via
        // createOrderFromQuote (cotação interna → aceite → pedido; vínculo
        // orders.quoteId com índice único, transição ACCEPTED → CONVERTED).
        // Coorte impede taxa > 100% e pedidos órfãos de inflar o numerador.
        (async () => {
            const db = await getDb();
            const [row] = await db
                .select({
                    total: sql<number>`COUNT(*)`,
                    converted: sql<number>`SUM(CASE WHEN ${simulations.status} = 'CONVERTED' THEN 1 ELSE 0 END)`,
                })
                .from(simulations)
                .where(and(eq(simulations.tenantId, tenantId), gte(simulations.createdAt, last7d)));
            const total = Number(row?.total ?? 0);
            const converted = Number(row?.converted ?? 0);
            return total > 0 ? (converted / total) * 100 : 0;
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
