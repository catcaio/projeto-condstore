import { mysqlTable, varchar, decimal, int, timestamp, text, index, uniqueIndex } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// --- Tenants (Multi-Tenant Support) ---

export const tenants = mysqlTable('tenants', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    twilioNumber: varchar('twilio_number', { length: 30 }).notNull().unique(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    plan: varchar('plan', { length: 50 }),
    planStatus: varchar('plan_status', { length: 50 }),
    planCurrentPeriodEnd: timestamp('plan_current_period_end'),
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
    apiKey: varchar('api_key', { length: 512 }),
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
    toPhone: varchar('to_phone', { length: 30 }),
    body: text('body').notNull(),
    direction: varchar('direction', { length: 10 }).notNull().default('inbound'),
    intent: varchar('intent', { length: 50 }).notNull().default('unknown'),
    intentConfidence: decimal('intent_confidence', { precision: 5, scale: 4 }),
    rawPayload: text('raw_payload').notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        tenantIdCreatedAtIndex: index('idx_messages_tenant_created_at').on(table.tenantId, table.createdAt),
    };
});

export type MessageRecord = typeof messages.$inferSelect;
export type NewMessageRecord = typeof messages.$inferInsert;

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

// --- Funnel Events (Instrumented WhatsApp Flow) ---

export const freightFunnelEvents = mysqlTable('freight_funnel_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 30 }).notNull(),
    sessionId: varchar('session_id', { length: 36 }).notNull(),
    stage: varchar('stage', { length: 50 }).notNull(), // INTENT_DETECTED, ASKED_CEP, CEP_RECEIVED, QUOTE_SENT, ABANDONED
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        // Unique Constraint: One event per stage per session
        uniqueStage: uniqueIndex('idx_funnel_unique_stage').on(table.sessionId, table.stage),
        idxTenantTime: index('idx_funnel_tenant_time').on(table.tenantId, table.createdAt),
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
    anonId: varchar('anon_id', { length: 128 }).notNull(),
    event: varchar('event', { length: 64 }).notNull(),
    path: varchar('path', { length: 200 }).notNull(),
    props: text('props'), // JSON stringified up to 4096 chars evaluated at runtime
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        eventTimeIdx: index('idx_public_events_event_time').on(table.event, table.createdAt),
        anonIdTimeIdx: index('idx_public_events_anon_time').on(table.anonId, table.createdAt),
    };
});

export type PublicEventRecord = typeof publicEvents.$inferSelect;
export type NewPublicEventRecord = typeof publicEvents.$inferInsert;
