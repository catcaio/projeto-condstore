import { mysqlTable, varchar, decimal, int, timestamp, text, index, uniqueIndex, json, date, primaryKey, datetime, mysqlEnum, boolean } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// --- Tenants (Multi-Tenant Support) ---

export const tenants = mysqlTable('tenants', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    twilioNumber: varchar('twilio_number', { length: 30 }).notNull().unique(),
    timezone: varchar('timezone', { length: 64 }).notNull().default('America/Sao_Paulo'),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    plan: varchar('plan', { length: 50 }),
    planStatus: varchar('plan_status', { length: 50 }),
    planCurrentPeriodEnd: timestamp('plan_current_period_end'),
    outboundEnabled: boolean('outbound_enabled').default(true).notNull(),
    incidentMode: boolean('incident_mode').default(false).notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type TenantRecord = typeof tenants.$inferSelect;
export type NewTenantRecord = typeof tenants.$inferInsert;

export const tenantAiProviders = mysqlTable('tenant_ai_providers', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    providerType: varchar('provider_type', { length: 30 }).notNull(),
    baseUrl: varchar('base_url', { length: 255 }).notNull(),
    model: varchar('model', { length: 255 }).notNull(),
    embedModel: varchar('embed_model', { length: 255 }).notNull(),
    apiKeyEncrypted: varchar('api_key_encrypted', { length: 512 }),
    isEnabled: int('is_enabled').notNull().default(1),
    timeoutMs: int('timeout_ms').notNull().default(20000),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => {
    return {
        tenantIdIndex: index('idx_tenant_ai_providers_tenant_id').on(table.tenantId),
    };
});

export type TenantAIProviderRecord = typeof tenantAiProviders.$inferSelect;
export type NewTenantAIProviderRecord = typeof tenantAiProviders.$inferInsert;

export const tenantEvents = mysqlTable('tenant_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    payload: text('payload'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        tenantIdCreatedAtIndex: index('idx_tenant_events_tenant_created_at').on(table.tenantId, table.createdAt),
    };
});

export type TenantEventRecord = typeof tenantEvents.$inferSelect;
export type NewTenantEventRecord = typeof tenantEvents.$inferInsert;


export const simulations = mysqlTable('simulations', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    cep: varchar('cep', { length: 8 }).notNull(),
    weight: decimal('weight', { precision: 10, scale: 2 }).notNull(),
    quantity: int('quantity').notNull(),
    productCost: decimal('product_cost', { precision: 10, scale: 2 }),
    sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }),
    bestCarrier: varchar('best_carrier', { length: 100 }),
    bestService: varchar('best_service', { length: 100 }),
    bestPrice: decimal('best_price', { precision: 10, scale: 2 }),
    bestMargin: decimal('best_margin', { precision: 10, scale: 2 }),
    strategy: varchar('strategy', { length: 50 }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
    event: varchar('event', { length: 50 }).notNull().default('FREIGHT_QUOTED'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        tenantIdCreatedAtIndex: index('idx_simulations_tenant_created_at').on(table.tenantId, table.createdAt),
    };
});

export type SimulationRecord = typeof simulations.$inferSelect;
export type NewSimulationRecord = typeof simulations.$inferInsert;

// ---  Messages (inbound WhatsApp audit log) ---

export const messages = mysqlTable('messages', {
    messageSid: varchar('message_sid', { length: 64 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    fromPhone: varchar('from_phone', { length: 30 }).notNull(),
    phoneHash: varchar('phone_hash', { length: 64 }),
    phoneEncrypted: text('phone_encrypted'),
    toPhone: varchar('to_phone', { length: 30 }),
    body: text('body').notNull(),
    bodyEncrypted: text('body_encrypted'),
    direction: varchar('direction', { length: 10 }).notNull().default('inbound'),
    intent: varchar('intent', { length: 50 }).notNull().default('unknown'),
    intentConfidence: decimal('intent_confidence', { precision: 5, scale: 4 }),
    rawPayload: text('raw_payload').notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        tenantIdCreatedAtIndex: index('idx_messages_tenant_created_at').on(table.tenantId, table.createdAt),
        tenantPhoneHashCreatedAtIndex: index('idx_messages_tenant_phone_hash_created_at').on(table.tenantId, table.phoneHash, table.createdAt),
    };
});

export type MessageRecord = typeof messages.$inferSelect;
export type NewMessageRecord = typeof messages.$inferInsert;

export const inboundMessageDedup = mysqlTable('inbound_message_dedup', {
    messageSid: varchar('message_sid', { length: 64 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        tenantCreatedAtIndex: index('idx_inbound_message_dedup_tenant_created_at').on(table.tenantId, table.createdAt),
        createdAtIndex: index('idx_inbound_message_dedup_created_at').on(table.createdAt),
    };
});

export type InboundMessageDedupRecord = typeof inboundMessageDedup.$inferSelect;
export type NewInboundMessageDedupRecord = typeof inboundMessageDedup.$inferInsert;

// --- AI Decision Logs (Frank audit trail) ---

export const aiDecisionLogs = mysqlTable('ai_decision_logs', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    messageId: varchar('message_id', { length: 64 }).notNull(),
    providerEventId: varchar('provider_event_id', { length: 64 }),
    provider: varchar('provider', { length: 30 }).notNull(),
    model: varchar('model', { length: 255 }).notNull(),
    intent: varchar('intent', { length: 50 }).notNull(),
    confidence: decimal('confidence', { precision: 5, scale: 4 }),
    toolUsed: varchar('tool_used', { length: 100 }),
    toolPayload: text('tool_payload'),
    tokensIn: int('tokens_in'),
    tokensOut: int('tokens_out'),
    latencyMs: int('latency_ms'),
    responseType: varchar('response_type', { length: 30 }).notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        tenantIdCreatedAtIndex: index('idx_ai_decision_logs_tenant_created_at').on(table.tenantId, table.createdAt),
    };
});

export type AiDecisionLogRecord = typeof aiDecisionLogs.$inferSelect;
export type NewAiDecisionLogRecord = typeof aiDecisionLogs.$inferInsert;

// --- Frank Events (LLM observability/audit) ---

export const frankEvents = mysqlTable('frank_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 100 }).notNull(),
    sessionId: varchar('session_id', { length: 100 }),
    correlationId: varchar('correlation_id', { length: 100 }),
    kind: varchar('kind', { length: 50 }).notNull(),
    payloadJson: json('payload_json').notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    latencyMs: int('latency_ms').notNull(),
    tokensPrompt: int('tokens_prompt').notNull().default(0),
    tokensCompletion: int('tokens_completion').notNull().default(0),
    ragUsed: int('rag_used').notNull().default(0),
    ragChunks: int('rag_chunks').notNull().default(0),
    ragLatencyMs: int('rag_latency_ms').notNull().default(0),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        tenantIdIndex: index('idx_frank_events_tenant_id').on(table.tenantId),
        correlationIdIndex: index('idx_frank_events_correlation_id').on(table.correlationId),
        createdAtIndex: index('idx_frank_events_created_at').on(table.createdAt),
    };
});

export type FrankEventRecord = typeof frankEvents.$inferSelect;
export type NewFrankEventRecord = typeof frankEvents.$inferInsert;

// --- Frank Rollout Decisions (scheduler audit) ---

export const frankRolloutDecisions = mysqlTable('frank_rollout_decisions', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 100 }).notNull(),
    baseline: varchar('baseline', { length: 50 }).notNull(),
    candidate: varchar('candidate', { length: 50 }).notNull(),
    decision: varchar('decision', { length: 30 }).notNull(), // PASS | FAIL | INSUFFICIENT_DATA
    applied: int('applied').notNull().default(0), // 0/1
    dryRun: int('dry_run').notNull().default(1), // 0/1
    reasonsJson: json('reasons_json'),
    metricsJson: json('metrics_json'),
    requestId: varchar('request_id', { length: 50 }).notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        tenantIdIndex: index('idx_frank_rollout_decisions_tenant_id').on(table.tenantId),
        requestIdIndex: index('idx_frank_rollout_decisions_request_id').on(table.requestId),
        createdAtIndex: index('idx_frank_rollout_decisions_created_at').on(table.createdAt),
    };
});

export type FrankRolloutDecisionRecord = typeof frankRolloutDecisions.$inferSelect;
export type NewFrankRolloutDecisionRecord = typeof frankRolloutDecisions.$inferInsert;

// --- Users (Authentication) ---

export const users = mysqlTable('users', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 512 }).notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('operator'),
    sessionVersion: int('session_version').notNull().default(1),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;

export type TenantKnowledgeSourceRecord = typeof tenantKnowledgeSources.$inferSelect;
export type NewTenantKnowledgeSourceRecord = typeof tenantKnowledgeSources.$inferInsert;

// --- Funnel Events (Instrumented WhatsApp Flow) ---

export const freightFunnelEvents = mysqlTable('freight_funnel_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 30 }).notNull(),
    phoneHash: varchar('phone_hash', { length: 64 }),
    phoneEncrypted: text('phone_encrypted'),
    sessionId: varchar('session_id', { length: 36 }).notNull(),
    stage: varchar('stage', { length: 50 }).notNull(), // INTENT_DETECTED, ASKED_CEP, CEP_RECEIVED, QUOTE_SENT, ABANDONED
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    utmTerm: varchar('utm_term', { length: 255 }),
    utmContent: varchar('utm_content', { length: 255 }),
    refToken: varchar('ref_token', { length: 128 }),
    clickId: varchar('click_id', { length: 255 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        // Unique Constraint: One event per stage per session
        uniqueStage: uniqueIndex('idx_funnel_unique_stage').on(table.sessionId, table.stage),
        idxTenantTime: index('idx_funnel_tenant_time').on(table.tenantId, table.createdAt),
        idxTenantPhoneHashTime: index('idx_funnel_tenant_phone_hash_time').on(table.tenantId, table.phoneHash, table.createdAt),
    };
});

export type FreightFunnelEventRecord = typeof freightFunnelEvents.$inferSelect;
export type NewFreightFunnelEventRecord = typeof freightFunnelEvents.$inferInsert;
// --- Freight Simulation Logs (metrics/audit) ---

export const freightSimulationLogs = mysqlTable('freight_simulation_logs', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 100 }).notNull(),
    uf: varchar('uf', { length: 2 }).notNull(),
    peso: decimal('peso', { precision: 10, scale: 2 }).notNull(),
    valor: decimal('valor', { precision: 10, scale: 2 }).notNull(),
    prazo: int('prazo').notNull(),
    cepHash: varchar('cep_hash', { length: 64 }).notNull(),
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    utmTerm: varchar('utm_term', { length: 255 }),
    utmContent: varchar('utm_content', { length: 255 }),
    refToken: varchar('ref_token', { length: 128 }),
    clickId: varchar('click_id', { length: 255 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        tenantIdCreatedAtIndex: index('idx_freight_sim_logs_tenant_created_at').on(table.tenantId, table.createdAt),
    };
});

export type FreightSimulationLogRecord = typeof freightSimulationLogs.$inferSelect;
export type NewFreightSimulationLogRecord = typeof freightSimulationLogs.$inferInsert;

// --- Project Evolution Reports ---

export const projectReports = mysqlTable('project_reports', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    moduleKey: varchar('module_key', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    summary: text('summary').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('done'), // planned, in_progress, done, blocked
    changes: text('changes'), // JSON string list
    metrics: text('metrics'), // JSON string object
    risks: text('risks'), // JSON string list
    nextActions: text('next_actions'), // JSON string list
    tags: text('tags'), // JSON string list
    source: varchar('source', { length: 20 }).notNull().default('manual'), // manual, automation
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
}, (table) => {
    return {
        idxModule: index('idx_report_module').on(table.moduleKey),
        idxHash: uniqueIndex('idx_report_hash').on(table.contentHash),
    };
});

export type ProjectReportRecord = typeof projectReports.$inferSelect;
export type NewProjectReportRecord = typeof projectReports.$inferInsert;

// --- Public Conversion Tracking (Landing & Pricing Analytics) ---

export const publicEvents = mysqlTable('public_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    anonId: varchar('anon_id', { length: 128 }).notNull(),
    event: varchar('event', { length: 64 }).notNull(),
    path: varchar('path', { length: 200 }).notNull(),
    props: text('props'), // JSON stringified up to 4096 chars evaluated at runtime
    userAgent: text('user_agent'),
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    utmTerm: varchar('utm_term', { length: 255 }),
    utmContent: varchar('utm_content', { length: 255 }),
    refToken: varchar('ref_token', { length: 128 }),
    clickId: varchar('click_id', { length: 255 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        tenantTimeIdx: index('idx_public_events_tenant_created_at').on(table.tenantId, table.createdAt),
        eventTimeIdx: index('idx_public_events_event_time').on(table.event, table.createdAt),
        anonIdTimeIdx: index('idx_public_events_anon_time').on(table.anonId, table.createdAt),
        utmSourceTimeIdx: index('idx_public_events_utm_source_time').on(table.tenantId, table.utmSource, table.createdAt),
        utmCampaignTimeIdx: index('idx_public_events_utm_campaign_time').on(table.tenantId, table.utmCampaign, table.createdAt),
    };
});

export type PublicEventRecord = typeof publicEvents.$inferSelect;
export type NewPublicEventRecord = typeof publicEvents.$inferInsert;

export const attributionClicks = mysqlTable('attribution_clicks', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    token: varchar('token', { length: 128 }).notNull(),
    tenantId: varchar('tenant_id', { length: 36 }),
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    utmTerm: varchar('utm_term', { length: 255 }),
    utmContent: varchar('utm_content', { length: 255 }),
    clickId: varchar('click_id', { length: 255 }),
    landingUrl: varchar('landing_url', { length: 2048 }),
    userAgentHash: varchar('user_agent_hash', { length: 64 }),
    ipHash: varchar('ip_hash', { length: 64 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    consumedAt: timestamp('consumed_at'),
}, (table) => {
    return {
        tokenUnique: uniqueIndex('idx_attribution_clicks_token').on(table.token),
        tenantCreatedAtIdx: index('idx_attribution_clicks_tenant_created_at').on(table.tenantId, table.createdAt),
        consumedAtIdx: index('idx_attribution_clicks_consumed_at').on(table.consumedAt),
    };
});

export type AttributionClickRecord = typeof attributionClicks.$inferSelect;
export type NewAttributionClickRecord = typeof attributionClicks.$inferInsert;

export const metricsDaily = mysqlTable('metrics_daily', {
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    dayDate: date('day_date', { mode: 'string' }).notNull(),
    utmSource: varchar('utm_source', { length: 255 }).notNull().default('(none)'),
    utmCampaign: varchar('utm_campaign', { length: 255 }).notNull().default('(none)'),
    totalEvents: int('total_events').notNull().default(0),
    funnelStarted: int('funnel_started').notNull().default(0),
    freightSimulations: int('freight_simulations').notNull().default(0),
    consumedTokens: int('consumed_tokens').notNull().default(0),
    clickTokens: int('click_tokens').notNull().default(0),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.tenantId, table.dayDate, table.utmSource, table.utmCampaign], name: 'pk_metrics_daily' }),
        tenantDayIdx: index('idx_metrics_daily_tenant_day').on(table.tenantId, table.dayDate),
        tenantSourceDayIdx: index('idx_metrics_daily_tenant_source_day').on(table.tenantId, table.utmSource, table.dayDate),
        tenantCampaignDayIdx: index('idx_metrics_daily_tenant_campaign_day').on(table.tenantId, table.utmCampaign, table.dayDate),
    };
});

export type MetricsDailyRecord = typeof metricsDaily.$inferSelect;
export type NewMetricsDailyRecord = typeof metricsDaily.$inferInsert;

export const metricsRollupStatus = mysqlTable('metrics_rollup_status', {
    tenantId: varchar('tenant_id', { length: 36 }).primaryKey().notNull(),
    lastDayProcessed: date('last_day_processed', { mode: 'string' }),
    lastRunAt: datetime('last_run_at', { mode: 'date' }),
    lastDurationMs: int('last_duration_ms'),
    lastRowsWritten: int('last_rows_written'),
    status: mysqlEnum('status', ['ok', 'error']).notNull().default('ok'),
    lastErrorCode: varchar('last_error_code', { length: 64 }),
});

export type MetricsRollupStatusRecord = typeof metricsRollupStatus.$inferSelect;
export type NewMetricsRollupStatusRecord = typeof metricsRollupStatus.$inferInsert;

export const adminAuditLog = mysqlTable('admin_audit_log', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    metadata: json('metadata'),
    createdAt: datetime('created_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        tenantCreatedAtIdx: index('idx_admin_audit_log_tenant_created_at').on(table.tenantId, table.createdAt),
        userCreatedAtIdx: index('idx_admin_audit_log_user_created_at').on(table.userId, table.createdAt),
        actionCreatedAtIdx: index('idx_admin_audit_log_action_created_at').on(table.action, table.createdAt),
    };
});

export type AdminAuditLogRecord = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLogRecord = typeof adminAuditLog.$inferInsert;

export const tenantSavedViews = mysqlTable('tenant_saved_views', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    module: varchar('module', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    filtersJson: text('filters_json').notNull(),
    createdByUserId: varchar('created_by_user_id', { length: 36 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => {
    return {
        tenantModuleUpdatedAtIdx: index('idx_saved_views_tenant_module_updated_at').on(table.tenantId, table.module, table.updatedAt),
        tenantModuleNameUnique: uniqueIndex('idx_saved_views_tenant_module_name').on(table.tenantId, table.module, table.name),
    };
});

export type TenantSavedViewRecord = typeof tenantSavedViews.$inferSelect;
export type NewTenantSavedViewRecord = typeof tenantSavedViews.$inferInsert;

// --- Agent Mesh: Budget & Lock State ---

export const tenantBudgets = mysqlTable('tenant_budgets', {
    tenantId: varchar('tenant_id', { length: 36 }).primaryKey().notNull(),
    monthlyTokenLimit: int('monthly_token_limit').notNull().default(1000000),
    tokensConsumed: int('tokens_consumed').notNull().default(0),
    // 'unlocked' | 'degraded' (>=softLimit%) | 'locked' (>=hardLimit%)
    currentLockState: varchar('current_lock_state', { length: 20 }).notNull().default('unlocked'),
    // Monotonically increasing. Redis only overwrites when its copy is stale.
    stateRevision: int('state_revision').notNull().default(1),
    // ── FinOps USD budget ────────────────────────────────────────────────────
    // Monthly budget cap in USD (0 = token-only mode, no USD enforcement)
    monthlyBudgetUsd: decimal('monthly_budget_usd', { precision: 12, scale: 6 }).notNull().default('0'),
    // Percentage thresholds driven by USD spend
    softLimitPercent: int('soft_limit_percent').notNull().default(80),
    hardLimitPercent: int('hard_limit_percent').notNull().default(100),
    // Incremental USD spend this calendar month (updated by insertUsageEvent)
    currentMonthUsd: decimal('current_month_usd', { precision: 12, scale: 6 }).notNull().default('0'),
    // Burn rate estimate: currentMonthUsd / days since lastBudgetResetAt
    burnRatePerDay: decimal('burn_rate_per_day', { precision: 12, scale: 6 }),
    // Date the monthly counter was last zeroed (first-of-month reset)
    lastBudgetResetAt: timestamp('last_budget_reset_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

export type TenantBudgetRecord = typeof tenantBudgets.$inferSelect;
export type NewTenantBudgetRecord = typeof tenantBudgets.$inferInsert;

export const finopsAlertEvents = mysqlTable('finops_alert_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    prevState: varchar('prev_state', { length: 50 }).notNull(),
    nextState: varchar('next_state', { length: 50 }).notNull(),
    reason: varchar('reason', { length: 100 }).notNull(),
    projectedDaysToHardLimit: decimal('projected_days_to_hard_limit', { precision: 10, scale: 2 }),
    currentMonthUsd: decimal('current_month_usd', { precision: 12, scale: 6 }).notNull().default('0'),
    monthlyBudgetUsd: decimal('monthly_budget_usd', { precision: 12, scale: 6 }).notNull().default('0'),
    burnRatePerDay: decimal('burn_rate_per_day', { precision: 12, scale: 6 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    tenantCreatedIdx: index('idx_finops_alert_events_tenant_created').on(table.tenantId, table.createdAt),
    tenantStateIdx: index('idx_finops_alert_events_tenant_state').on(table.tenantId, table.nextState, table.createdAt),
}));

export const finopsLockEvents = mysqlTable('finops_lock_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    lockedAt: timestamp('locked_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    currentMonthUsd: decimal('current_month_usd', { precision: 12, scale: 6 }).notNull().default('0'),
    monthlyBudgetUsd: decimal('monthly_budget_usd', { precision: 12, scale: 6 }).notNull().default('0'),
    burnRatePerDay: decimal('burn_rate_per_day', { precision: 12, scale: 6 }),
    resolvedAt: timestamp('resolved_at'),
    resolutionType: varchar('resolution_type', { length: 50 }),
}, (table) => ({
    tenantActiveIdx: index('idx_finops_lock_events_tenant_active').on(table.tenantId, table.resolvedAt),
}));

export const finopsMonthlyResets = mysqlTable('finops_monthly_resets', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    resetMonth: varchar('reset_month', { length: 10 }).notNull(), // format YYYY-MM
    prevCurrentMonthUsd: decimal('prev_current_month_usd', { precision: 12, scale: 6 }).notNull().default('0'),
    prevBurnRatePerDay: decimal('prev_burn_rate_per_day', { precision: 12, scale: 6 }),
    performedAt: timestamp('performed_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    tenantMonthUniqueIdx: uniqueIndex('idx_finops_monthly_resets_tenant_month').on(table.tenantId, table.resetMonth),
}));


// --- Agent Mesh: FinOps LLM Base ---

export const tokenUsageEvents = mysqlTable('token_usage_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    // Idempotency key: one row per LLM call. Prevents double-spend on Worker retry.
    traceId: varchar('trace_id', { length: 36 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'usage' | 'loop_guard_violation'
    modelUsed: varchar('model_used', { length: 100 }).notNull().default('unknown'),
    inputTokens: int('input_tokens').notNull().default(0),
    outputTokens: int('output_tokens').notNull().default(0),
    estimatedCostUsd: decimal('estimated_cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
    // Nullable: set by Worker when consumed into tenant_usage_metrics
    processedByWorker: timestamp('processed_by_worker'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    // Hard idempotency guard: one event per LLM trace
    traceIdUnique: uniqueIndex('idx_token_usage_events_trace_id').on(table.traceId),
    tenantCreatedAtIdx: index('idx_token_usage_events_tenant_created_at').on(table.tenantId, table.createdAt),
}));

export type TokenUsageEventRecord = typeof tokenUsageEvents.$inferSelect;
export type NewTokenUsageEventRecord = typeof tokenUsageEvents.$inferInsert;

// Aggregated daily snapshot per tenant — populated by the Control Plane Worker (future)
export const tenantUsageMetrics = mysqlTable('tenant_usage_metrics', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    // Day-level granularity: all events for a calendar day are merged here
    date: date('date', { mode: 'string' }).notNull(),
    totalRequests: int('total_requests').notNull().default(0),
    totalToolCalls: int('total_tool_calls').notNull().default(0),
    totalTokensInput: int('total_tokens_input').notNull().default(0),
    totalTokensOutput: int('total_tokens_output').notNull().default(0),
    estimatedCostUsd: decimal('estimated_cost_usd', { precision: 12, scale: 6 }).notNull().default('0'),
    // e.g. {"gpt-4o": 120, "gpt-4o-mini": 55}
    modelDistributionJson: json('model_distribution_json').notNull().default({}),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    // One row per tenant per day — Worker uses ON CONFLICT DO UPDATE
    unqTenantDate: uniqueIndex('idx_tenant_usage_metrics_tenant_date').on(table.tenantId, table.date),
    tenantDateIdx: index('idx_tenant_usage_metrics_tenant_date_q').on(table.tenantId, table.date),
}));

export type TenantUsageMetricRecord = typeof tenantUsageMetrics.$inferSelect;
export type NewTenantUsageMetricRecord = typeof tenantUsageMetrics.$inferInsert;

// --- AI Prompts (Governance & Security) ---

export const aiPrompts = mysqlTable('ai_prompts', {
    id: varchar('id', { length: 128 }).notNull(), // e.g. "cockpit:support"
    version: varchar('version', { length: 50 }).notNull(), // e.g. "v1.0.0"
    system: text('system').notNull(),
    temperature: decimal('temperature', { precision: 3, scale: 2 }).notNull().default('0.7'),
    maxTokens: int('max_tokens').notNull().default(1000),
    active: int('active').notNull().default(0), // 0 or 1
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.id, table.version], name: 'pk_ai_prompts_id_version' }),
    activeIdx: index('idx_ai_prompts_active').on(table.active)
}));

export type AiPromptRecord = typeof aiPrompts.$inferSelect;
export type NewAiPromptRecord = typeof aiPrompts.$inferInsert;

export const aiEvalRuns = mysqlTable('ai_eval_runs', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    promptId: varchar('prompt_id', { length: 128 }).notNull(),
    promptVersion: varchar('prompt_version', { length: 50 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    score: int('score').notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    reportJson: json('report_json').notNull(),
}, (table) => ({
    promptIdIdx: index('idx_ai_eval_runs_prompt_id').on(table.promptId),
    createdIdx: index('idx_ai_eval_runs_created_at').on(table.createdAt)
}));

export type AiEvalRunRecord = typeof aiEvalRuns.$inferSelect;
export type NewAiEvalRunRecord = typeof aiEvalRuns.$inferInsert;

// --- Webhook Hardening ---

export const webhookEvents = mysqlTable('webhook_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    provider: varchar('provider', { length: 32 }).notNull(), // e.g. "twilio"
    externalId: varchar('external_id', { length: 128 }).notNull(), // messageSid/eventId
    receivedAt: timestamp('received_at').notNull(),
    payloadHash: varchar('payload_hash', { length: 128 }).notNull(),
    processedAt: timestamp('processed_at'),
    status: varchar('status', { length: 32 }).notNull(), // 'received' | 'processed' | 'failed'
}, (table) => ({
    providerExternalIdx: uniqueIndex('idx_webhook_events_provider_external').on(table.provider, table.externalId),
}));

export type WebhookEventRecord = typeof webhookEvents.$inferSelect;
export type NewWebhookEventRecord = typeof webhookEvents.$inferInsert;

// --- Billing Core ---

export const plans = mysqlTable('plans', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    monthlyPriceUsd: decimal('monthly_price_usd', { precision: 12, scale: 6 }).notNull(),
    monthlyBudgetUsd: decimal('monthly_budget_usd', { precision: 12, scale: 6 }).notNull(),
    softLimitPercent: int('soft_limit_percent').notNull().default(80),
    hardLimitPercent: int('hard_limit_percent').notNull().default(100),
    active: int('active').notNull().default(1), // 1=true, 0=false (MySQL boolean)
});

export type PlanRecord = typeof plans.$inferSelect;
export type NewPlanRecord = typeof plans.$inferInsert;

export const tenantSubscriptions = mysqlTable('tenant_subscriptions', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    planId: varchar('plan_id', { length: 36 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(), // 'active' | 'canceled' | 'past_due'
    startedAt: timestamp('started_at').notNull(),
    endedAt: timestamp('ended_at'),
    stripeCustomerId: varchar('stripe_customer_id', { length: 128 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 128 }),
    lastPaymentFailedAt: timestamp('last_payment_failed_at'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    currentPeriodEnd: timestamp('current_period_end'),
}, (table) => ({
    tenantIdx: uniqueIndex('idx_tenant_subscriptions_tenant').on(table.tenantId),
}));

export type TenantSubscriptionRecord = typeof tenantSubscriptions.$inferSelect;
export type NewTenantSubscriptionRecord = typeof tenantSubscriptions.$inferInsert;

export const billingLedger = mysqlTable('billing_ledger', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    type: varchar('type', { length: 32 }).notNull(), // 'upgrade' | 'downgrade' | 'manual_adjust'
    amountUsd: decimal('amount_usd', { precision: 12, scale: 6 }),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull(),
}, (table) => ({
    tenantIdx: index('idx_billing_ledger_tenant').on(table.tenantId),
    tenantCreatedIdx: index('idx_billing_ledger_tenant_created').on(table.tenantId, table.createdAt),
}));

export type BillingLedgerRecord = typeof billingLedger.$inferSelect;
export type NewBillingLedgerRecord = typeof billingLedger.$inferInsert;

// --- Stripe Events (idempotency) ---
// id            = Stripe event ID (PK, backward compat)
// stripeEventId = explicit alias with UNIQUE constraint (belt + suspenders)
// stripeCreatedAt = timestamp from Stripe event object for audit ordering
// payloadHash   = SHA256(rawBody) to detect payload tampering on replay

export const stripeEvents = mysqlTable('stripe_events', {
    id: varchar('id', { length: 128 }).primaryKey().notNull(),           // Stripe event ID
    stripeEventId: varchar('stripe_event_id', { length: 128 }).notNull(), // UNIQUE alias
    receivedAt: timestamp('received_at').notNull(),
    type: varchar('type', { length: 128 }).notNull(),
    stripeCreatedAt: timestamp('stripe_created_at'),
    payloadHash: varchar('payload_hash', { length: 64 }),
}, (table) => ({
    stripeEventIdIdx: uniqueIndex('uq_stripe_events_event_id').on(table.stripeEventId),
}));

export type StripeEventRecord = typeof stripeEvents.$inferSelect;
export type NewStripeEventRecord = typeof stripeEvents.$inferInsert;

// --- Frank Knowledge Inbox MVP ---

export const tenantCollections = mysqlTable('tenant_collections', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    sourceType: varchar('source_type', { length: 32 }).default('manual').notNull(),
    connectorType: varchar('connector_type', { length: 32 }),
    autoSync: boolean('auto_sync').default(false).notNull(),
    lastSyncAt: timestamp('last_sync_at'),
    syncStatus: varchar('sync_status', { length: 32 }).default('idle').notNull(),
    connectorConfig: json('connector_config'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});
export type TenantCollectionRecord = typeof tenantCollections.$inferSelect;
export type NewTenantCollectionRecord = typeof tenantCollections.$inferInsert;

export const tenantDocuments = mysqlTable('tenant_documents', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    createdBy: varchar('created_by', { length: 36 }).notNull(), // user ID sub
    collectionId: varchar('collection_id', { length: 36 }),
    isSensitive: boolean('is_sensitive').default(false).notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    tenantIdCreatedIdx: index('idx_tenant_documents_tenant_created').on(table.tenantId, table.createdAt),
}));
export type TenantDocumentRecord = typeof tenantDocuments.$inferSelect;
export type NewTenantDocumentRecord = typeof tenantDocuments.$inferInsert;

export const tenantDocumentVersions = mysqlTable('tenant_document_versions', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    documentId: varchar('document_id', { length: 36 }).notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    objectKey: varchar('object_key', { length: 512 }).notNull(),
    mimeType: varchar('mime_type', { length: 128 }).notNull(),
    sizeBytes: int('size_bytes').notNull(),
    sha256: varchar('sha256', { length: 64 }).notNull(),
    status: mysqlEnum('status', ['uploaded', 'queued', 'processing', 'ready', 'ready_indexed', 'failed']).notNull().default('uploaded'),
    extractedTextPreview: text('extracted_text_preview'),
    extractedMetaJson: json('extracted_meta_json'),
    errorCode: varchar('error_code', { length: 128 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    tenantIdSha256Idx: uniqueIndex('uq_tenant_docs_tenant_sha256').on(table.tenantId, table.sha256),
    tenantIdStatusIdx: index('idx_tenant_docs_tenant_status').on(table.tenantId, table.status),
}));
export type TenantDocumentVersionRecord = typeof tenantDocumentVersions.$inferSelect;
export type NewTenantDocumentVersionRecord = typeof tenantDocumentVersions.$inferInsert;

export const tenantDocumentTags = mysqlTable('tenant_document_tags', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    documentId: varchar('document_id', { length: 36 }).notNull(),
    tag: varchar('tag', { length: 128 }).notNull(),
}, (table) => ({
    tenantDocumentTagIdx: index('idx_tenant_docs_tags_doc').on(table.tenantId, table.documentId),
}));
export type TenantDocumentTagRecord = typeof tenantDocumentTags.$inferSelect;
export type NewTenantDocumentTagRecord = typeof tenantDocumentTags.$inferInsert;

export const tenantIngestionJobs = mysqlTable('tenant_ingestion_jobs', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    versionId: varchar('version_id', { length: 36 }).notNull(),
    status: mysqlEnum('status', ['queued', 'processing', 'completed', 'failed']).notNull().default('queued'),
    attempts: int('attempts').notNull().default(0),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});
export type TenantIngestionJobRecord = typeof tenantIngestionJobs.$inferSelect;
export type NewTenantIngestionJobRecord = typeof tenantIngestionJobs.$inferInsert;

export const tenantDocumentChunks = mysqlTable('tenant_document_chunks', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    versionId: varchar('version_id', { length: 36 }).notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    content: text('content').notNull(),
    pageNumber: int('page_number'),
    piiRiskScore: decimal('pii_risk_score', { precision: 5, scale: 2 }).default('0').notNull(),
    orderIndex: int('order_index').notNull(),
    charStart: int('char_start').notNull().default(0),
    charEnd: int('char_end').notNull().default(0),
    embedding: json('embedding'), // Legacy JSON standard
    vectorEmbedding: json('vector_embedding'), // TiDB Vector / PGVector target format
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    tenantIdVersionIdx: index('idx_tenant_chunks_tenant_version').on(table.tenantId, table.versionId),
}));
export type TenantDocumentChunkRecord = typeof tenantDocumentChunks.$inferSelect;
export type NewTenantDocumentChunkRecord = typeof tenantDocumentChunks.$inferInsert;

export const tenantKnowledgeQueries = mysqlTable('tenant_knowledge_queries', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    questionHash: varchar('question_hash', { length: 64 }).notNull(),
    questionPreview: varchar('question_preview', { length: 200 }).notNull(),
    confidence: decimal('confidence', { precision: 5, scale: 4 }).notNull(),
    citationsJson: json('citations_json'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    requestId: varchar('request_id', { length: 128 }),
}, (table) => ({
    tenantIdCreatedAtIdx: index('idx_tenant_knowledge_queries_tenant_created').on(table.tenantId, table.createdAt),
}));
export type TenantKnowledgeQueryRecord = typeof tenantKnowledgeQueries.$inferSelect;
export type NewTenantKnowledgeQueryRecord = typeof tenantKnowledgeQueries.$inferInsert;

// --- Security & Keys (Stored Secrets) ---

export const tenantSecrets = mysqlTable('tenant_secrets', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    scope: varchar('scope', { length: 50 }).notNull(), // 'twilio' | 'stripe' | 'internal' | 'ai_provider' | 'other'
    keyName: varchar('key_name', { length: 255 }).notNull(),
    valueEncrypted: text('value_encrypted').notNull(),
    valueHash: varchar('value_hash', { length: 64 }).notNull(), // sha256 to detect changes
    lastRotatedAt: timestamp('last_rotated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    lastVerifiedAt: timestamp('last_verified_at'),
    rotatedByUserId: varchar('rotated_by_user_id', { length: 36 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => {
    return {
        tenantScopeKeyIdx: uniqueIndex('uq_tenant_secrets_scope_key').on(table.tenantId, table.scope, table.keyName),
        tenantScopeIdx: index('idx_tenant_secrets_scope').on(table.tenantId, table.scope),
    };
});

export type TenantSecretRecord = typeof tenantSecrets.$inferSelect;
export type NewTenantSecretRecord = typeof tenantSecrets.$inferInsert;

export const tenantKnowledgeSources = mysqlTable('tenant_knowledge_sources', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(), // uuid
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'faq', 'manual', 'website'
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('draft'), // 'draft', 'syncing', 'active', 'error'
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tenantIncidents = mysqlTable('tenant_incidents', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(), // uuid
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'kill_switch', 'incident_mode', 'circuit_breaker'
    startedAt: timestamp('started_at').notNull(),
    endedAt: timestamp('ended_at'),
    triggeredBy: varchar('triggered_by', { length: 255 }).notNull(), // userId or system/circuit-breaker
    metadata: json('metadata'),
});

export type TenantIncidentRecord = typeof tenantIncidents.$inferSelect;
export type NewTenantIncidentRecord = typeof tenantIncidents.$inferInsert;

export const domineEvents = mysqlTable('domine_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    source: varchar('source', { length: 50 }).notNull(),
    type: varchar('type', { length: 128 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    payloadJson: json('payload_json'),
    processedAt: timestamp('processed_at'),
    status: varchar('status', { length: 30 }).notNull().default('queued'),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    nextRetryAt: timestamp('next_retry_at'),
}, (table) => ({
    tenantIdempotencyIdx: uniqueIndex('uq_domine_events_tenant_idempotency').on(table.tenantId, table.idempotencyKey),
    tenantStatusIdx: index('idx_domine_events_tenant_status').on(table.tenantId, table.status),
}));

export const domineOrders = mysqlTable('domine_orders', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    orderId: varchar('order_id', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    totals: json('totals'),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    tenantOrderIdx: uniqueIndex('uq_domine_orders_tenant_order').on(table.tenantId, table.orderId),
}));

export const domineFreightQuotes = mysqlTable('domine_freight_quotes', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    quoteId: varchar('quote_id', { length: 100 }).notNull(),
    orderId: varchar('order_id', { length: 100 }),
    summary: json('summary'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantQuoteIdx: uniqueIndex('uq_domine_freight_quotes_tenant_quote').on(table.tenantId, table.quoteId),
}));

export type DomineEventRecord = typeof domineEvents.$inferSelect;
export type NewDomineEventRecord = typeof domineEvents.$inferInsert;
export type DomineOrderRecord = typeof domineOrders.$inferSelect;
export type NewDomineOrderRecord = typeof domineOrders.$inferInsert;
export type DomineFreightQuoteRecord = typeof domineFreightQuotes.$inferSelect;
export type NewDomineFreightQuoteRecord = typeof domineFreightQuotes.$inferInsert;
