/**
 * Catálogo canônico das métricas oficiais do MVP (issue #396).
 *
 * `metrics` é a autoridade semântica: cada métrica oficial tem UMA definição
 * aqui e UMA query oficial em `metrics/queries`. Nenhum dashboard, rota ou
 * componente deve implementar fórmula própria para uma métrica oficial —
 * dashboards são apresentação e composição.
 *
 * Convenções:
 * - timezone: todas as métricas temporais usam America/Sao_Paulo explícito
 *   (`METRICS_TIMEZONE`); nunca o timezone implícito do runtime/banco.
 * - tenant: toda leitura/agregação filtra por `tenantId` (primeiro parâmetro
 *   das queries oficiais; queries rejeitam `tenantId` vazio).
 * - `analytics` (instrumentação/coleta em `public_events`) NÃO é fonte formal
 *   de KPI e não aparece neste catálogo.
 */

import { METRICS_TIMEZONE } from '../timezone';
import { METRIC_SOURCE_TABLES } from '../events/metric-events';

export interface MetricDefinition {
    /** Nome estável da métrica oficial. */
    name: string;
    /** Fórmula/definição em linguagem inequívoca. */
    formula: string;
    /** Fonte formal (tabela/evento). */
    source: string;
    /** Granularidade da leitura. */
    granularity: 'total' | 'daily' | 'monthly' | 'timeseries' | 'top_n' | 'average';
    /** Timezone aplicado a janelas temporais. */
    timezone: typeof METRICS_TIMEZONE;
    /** Escopo de isolamento. */
    tenantScope: 'tenant_id';
    /** Períodos suportados. */
    periods: string[];
    /** Query oficial correspondente em `metrics/queries`. */
    officialQuery: string;
}

function define(def: MetricDefinition): MetricDefinition {
    return def;
}

const TZ = METRICS_TIMEZONE;

/** Métricas de cotação de frete interna/operacional (fonte: `simulations`). */
export const FREIGHT_METRIC_DEFINITIONS: MetricDefinition[] = [
    define({
        name: 'freight.total_quotes',
        formula: 'COUNT(*) de simulations WHERE event = FREIGHT_QUOTED',
        source: METRIC_SOURCE_TABLES.simulations,
        granularity: 'total',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['all_time'],
        officialQuery: 'getFreightKpis',
    }),
    define({
        name: 'freight.avg_freight',
        formula: 'AVG(best_price) de simulations WHERE event = FREIGHT_QUOTED',
        source: METRIC_SOURCE_TABLES.simulations,
        granularity: 'average',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['all_time'],
        officialQuery: 'getFreightKpis',
    }),
    define({
        name: 'freight.avg_margin',
        formula: 'AVG(best_margin) de simulations WHERE event = FREIGHT_QUOTED',
        source: METRIC_SOURCE_TABLES.simulations,
        granularity: 'average',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['all_time'],
        officialQuery: 'getFreightKpis',
    }),
    define({
        name: 'freight.top_carriers',
        formula: 'Top 3 best_carrier por COUNT(*) WHERE event = FREIGHT_QUOTED',
        source: METRIC_SOURCE_TABLES.simulations,
        granularity: 'top_n',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['all_time'],
        officialQuery: 'getFreightKpis',
    }),
    define({
        name: 'freight.quotes_today',
        formula: 'COUNT(*) WHERE event = FREIGHT_QUOTED AND created_at >= início do dia em America/Sao_Paulo',
        source: METRIC_SOURCE_TABLES.simulations,
        granularity: 'daily',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['today'],
        officialQuery: 'getFreightKpis',
    }),
    define({
        name: 'freight.quotes_this_month',
        formula: 'COUNT(*) WHERE event = FREIGHT_QUOTED AND ano-mês(created_at em America/Sao_Paulo) = ano-mês(atual em America/Sao_Paulo)',
        source: METRIC_SOURCE_TABLES.simulations,
        granularity: 'monthly',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['month'],
        officialQuery: 'getFreightKpis',
    }),
    define({
        name: 'freight.timeseries',
        formula: 'Por dia (America/Sao_Paulo): COUNT(*) e AVG(best_price) WHERE event = FREIGHT_QUOTED, últimos 7 ou 30 dias',
        source: METRIC_SOURCE_TABLES.simulations,
        granularity: 'timeseries',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['7d', '30d'],
        officialQuery: 'getFreightTimeseries',
    }),
];

/** Métricas de simulação por UF (fonte: `freight_simulation_logs`, janelas UTC de 7/14 dias). */
export const FREIGHT_LOG_METRIC_DEFINITIONS: MetricDefinition[] = [
    define({
        name: 'freight_logs.simulations_7d',
        formula: 'COUNT(*) de freight_simulation_logs com created_at >= UTC_TIMESTAMP() - 7 dias',
        source: METRIC_SOURCE_TABLES.freightSimulationLogs,
        granularity: 'total',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['7d'],
        officialQuery: 'getFreightSimulationLogs',
    }),
    define({
        name: 'freight_logs.top_ufs_7d',
        formula: 'UFs por COUNT(*) (mesma janela de 7 dias), ordem desc',
        source: METRIC_SOURCE_TABLES.freightSimulationLogs,
        granularity: 'top_n',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['7d'],
        officialQuery: 'getFreightSimulationLogs',
    }),
    define({
        name: 'freight_logs.avg_valor_peso_prazo_7d',
        formula: 'AVG(valor) por UF, AVG(peso) global, AVG(prazo) por UF (janela de 7 dias)',
        source: METRIC_SOURCE_TABLES.freightSimulationLogs,
        granularity: 'average',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['7d'],
        officialQuery: 'getFreightSimulationLogs',
    }),
    define({
        name: 'freight_logs.daily_14d',
        formula: 'Por dia (DATE(created_at)): COUNT(*), últimos 14 dias',
        source: METRIC_SOURCE_TABLES.freightSimulationLogs,
        granularity: 'timeseries',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['14d'],
        officialQuery: 'getFreightSimulationLogs',
    }),
];

/** Métricas operacionais do dia (cockpit diário). */
export const OPERATIONAL_METRIC_DEFINITIONS: MetricDefinition[] = [
    define({
        name: 'ops.messages_today',
        formula: 'Total de conversation_messages do tenant com created_at >= início do dia em America/Sao_Paulo (+ breakdown por intent)',
        source: METRIC_SOURCE_TABLES.conversationMessages,
        granularity: 'daily',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['today'],
        officialQuery: 'getOperationalMetrics',
    }),
    define({
        name: 'ops.quotes_today',
        formula: 'COUNT(*) de simulations com created_at >= início do dia em America/Sao_Paulo',
        source: METRIC_SOURCE_TABLES.simulations,
        granularity: 'daily',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['today'],
        officialQuery: 'getOperationalMetrics',
    }),
    define({
        name: 'ops.orders_today',
        formula: 'COUNT(*) de orders com created_at >= CURDATE()',
        source: METRIC_SOURCE_TABLES.orders,
        granularity: 'daily',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['today'],
        officialQuery: 'getOperationalMetrics',
    }),
    define({
        name: 'ops.errors_24h',
        formula: 'COUNT(*) de operational_events com eventType LIKE %FAILED%/%ERROR% nas últimas 24h',
        source: METRIC_SOURCE_TABLES.operationalEvents,
        granularity: 'total',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['24h'],
        officialQuery: 'getOperationalMetrics',
    }),
    define({
        name: 'ops.handoffs_today',
        formula: "COUNT(*) de operational_events WHERE eventType = 'frank_assist_handoff' no dia (CURDATE())",
        source: METRIC_SOURCE_TABLES.operationalEvents,
        granularity: 'daily',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['today'],
        officialQuery: 'getOperationalMetrics',
    }),
    define({
        name: 'ops.avg_response_quote_time',
        formula: 'AVG(segundos) primeira inbound → primeira outbound humana / primeira cotação, últimos 7 dias (minutos na apresentação)',
        source: `${METRIC_SOURCE_TABLES.conversationMessages} + ${METRIC_SOURCE_TABLES.simulations}`,
        granularity: 'average',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['7d'],
        officialQuery: 'getOperationalMetrics',
    }),
    define({
        name: 'ops.quote_to_order_conversion_7d',
        formula: '100 * COUNT(orders 7d) / COUNT(simulations 7d) (0 quando sem cotações)',
        source: `${METRIC_SOURCE_TABLES.simulations} + ${METRIC_SOURCE_TABLES.orders}`,
        granularity: 'total',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['7d'],
        officialQuery: 'getOperationalMetrics',
    }),
    define({
        name: 'ops.attribution_breakdown_7d',
        formula: 'COUNT(*) de attribution_clicks por utm_source/utm_campaign, últimos 7 dias',
        source: METRIC_SOURCE_TABLES.attributionClicks,
        granularity: 'top_n',
        timezone: TZ,
        tenantScope: 'tenant_id',
        periods: ['7d'],
        officialQuery: 'getOperationalMetrics',
    }),
];

/** Catálogo completo (usado em testes de consistência). */
export const METRIC_DEFINITIONS: MetricDefinition[] = [
    ...FREIGHT_METRIC_DEFINITIONS,
    ...FREIGHT_LOG_METRIC_DEFINITIONS,
    ...OPERATIONAL_METRIC_DEFINITIONS,
];
