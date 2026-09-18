/**
 * Eventos-fonte formais das métricas oficiais (issue #396).
 *
 * Somente eventos listados aqui alimentam o contrato de métricas em
 * `metrics/definitions`. Instrumentação/analytics com finalidade própria
 * (ex. `analyticsService.logEvent` → `public_events`) NÃO é fonte formal
 * de KPI e permanece fora deste catálogo.
 *
 * Toda escrita de fato exige `tenantId` (isolamento por tenant).
 */

/** Fatos de cotação de frete interna/operacional → tabela `simulations`. */
export enum FreightEvent {
    REQUESTED = 'FREIGHT_QUOTE_REQUESTED',
    FAILED = 'FREIGHT_QUOTE_FAILED',
    QUOTED = 'FREIGHT_QUOTED',
}

/** Fatos operacionais lidos das tabelas transacionais (sem tabela de fatos própria). */
export const OPERATIONAL_FACT_EVENTS = {
    /** Mensagens de conversa → `conversation_messages` (via message.repository). */
    MESSAGE_PERSISTED: 'conversation_message_persisted',
    /** Pedidos criados → `orders`. */
    ORDER_CREATED: 'order_created',
    /** Falhas operacionais → `operational_events` (LIKE %FAILED%/%ERROR%). */
    OPERATIONAL_ERROR: 'operational_error',
    /** Handoff humano → `operational_events` (`frank_assist_handoff`). */
    HANDOFF: 'frank_assist_handoff',
} as const;

/** Tabelas-fonte formais do contrato de métricas. */
export const METRIC_SOURCE_TABLES = {
    simulations: 'simulations',
    freightSimulationLogs: 'freight_simulation_logs',
    conversationMessages: 'conversation_messages',
    orders: 'orders',
    operationalEvents: 'operational_events',
    attributionClicks: 'attribution_clicks',
} as const;
