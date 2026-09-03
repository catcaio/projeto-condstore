import { mysqlTable, varchar, decimal, double, int, timestamp, text, index, uniqueIndex, json, date, primaryKey, datetime, mysqlEnum, boolean } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// --- Operational Enums (WhatsApp Transactional Core) ---
export const MessageDirectionEnum = ['inbound', 'outbound'] as const;
export type MessageDirection = typeof MessageDirectionEnum[number];

export const ConversationStatusEnum = [
    'new', 
    'triaged', 
    'awaiting_human', 
    'draft_ready', 
    'approved', 
    'sent', 
    'delivered', 
    'closed',
    'blocked_guardrail',
    'operator_active',
    'failed_delivery'
] as const;
export type ConversationStatusType = typeof ConversationStatusEnum[number];

export const MessageDeliveryStatusEnum = [
    'queued',
    'sent',
    'delivered',
    'read',
    'failed'
] as const;
export type MessageDeliveryStatusType = typeof MessageDeliveryStatusEnum[number];

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

export const tenantConfigurations = mysqlTable('tenant_configurations', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    key: varchar('key', { length: 100 }).notNull(),
    value: json('value').notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
    createdBy: varchar('created_by', { length: 255 }),
}, (table) => {
    return {
        tenantKeyIndex: uniqueIndex('idx_tenant_config_key').on(table.tenantId, table.key),
        tenantCategoryIndex: index('idx_tenant_config_category').on(table.tenantId, table.category),
    };
});

export type TenantConfigurationRecord = typeof tenantConfigurations.$inferSelect;
export type NewTenantConfigurationRecord = typeof tenantConfigurations.$inferInsert;

export const tenantCustomFields = mysqlTable('tenant_custom_fields', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    entity: varchar('entity', { length: 50 }).notNull(), // customer, conversation, order, shipment, pipeline
    fieldKey: varchar('field_key', { length: 100 }).notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    type: varchar('type', { length: 30 }).notNull(), // text, number, select, boolean, date, textarea
    required: boolean('required').default(false).notNull(),
    options: json('options'), // For selects
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => {
    return {
        tenantEntityIndex: index('idx_tenant_custom_fields_entity').on(table.tenantId, table.entity),
        tenantKeyUniqueIndex: uniqueIndex('idx_tenant_custom_fields_key_unique').on(table.tenantId, table.entity, table.fieldKey),
    };
});

export type TenantCustomFieldRecord = typeof tenantCustomFields.$inferSelect;
export type NewTenantCustomFieldRecord = typeof tenantCustomFields.$inferInsert;

export const entityCustomValues = mysqlTable('entity_custom_values', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    entity: varchar('entity', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 64 }).notNull(),
    fieldKey: varchar('field_key', { length: 100 }).notNull(),
    value: text('value'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => {
    return {
        tenantEntityIdIndex: index('idx_entity_custom_values_id').on(table.tenantId, table.entityId),
        tenantEntityKeyUniqueIndex: uniqueIndex('idx_entity_custom_values_unique').on(table.tenantId, table.entityId, table.fieldKey),
    };
});

export type EntityCustomValueRecord = typeof entityCustomValues.$inferSelect;
export type NewEntityCustomValueRecord = typeof entityCustomValues.$inferInsert;

export const tenantPlaybooks = mysqlTable('tenant_playbooks', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    entity: varchar('entity', { length: 50 }).notNull(), // conversation, customer, order, shipment, pipeline
    version: int('version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    steps: json('steps').notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
    createdBy: varchar('created_by', { length: 36 }),
}, (table) => {
    return {
        tenantEntityIndex: index('idx_tenant_playbooks_entity').on(table.tenantId, table.entity),
    };
});

export type TenantPlaybookRecord = typeof tenantPlaybooks.$inferSelect;
export type NewTenantPlaybookRecord = typeof tenantPlaybooks.$inferInsert;

export const simulations = mysqlTable('simulations', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    customerId: varchar('customer_id', { length: 36 }),
    organizationId: varchar('organization_id', { length: 36 }),
    conversationId: varchar('conversation_id', { length: 36 }),
    createdBy: varchar('created_by', { length: 36 }),
    source: varchar('source', { length: 30 }).notNull().default('API'), // API | ATENDIMENTO
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
    
    // Novas colunas para estrutura comercial da Quote
    status: varchar('status', { length: 30 }).notNull().default('DRAFT'), // DRAFT, SENT, ACCEPTED, CONVERTED, EXPIRED
    items: json('items'),
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
    freightAmount: decimal('freight_amount', { precision: 12, scale: 2 }),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
    expiresAt: timestamp('expires_at'),
    sentAt: timestamp('sent_at'),
    convertedAt: timestamp('converted_at'),
    revisionCount: int('revision_count').notNull().default(0),

    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => {
    return {
        tenantIdCreatedAtIndex: index('idx_simulations_tenant_created_at').on(table.tenantId, table.createdAt),
        tenantIdConversationIdIndex: index('idx_simulations_tenant_conversation').on(table.tenantId, table.conversationId),
        tenantIdStatusIndex: index('idx_simulations_tenant_status').on(table.tenantId, table.status),
        tenantIdCustomerIndex: index('idx_simulations_tenant_customer').on(table.tenantId, table.customerId),
    };
});

export type SimulationRecord = typeof simulations.$inferSelect;
export type NewSimulationRecord = typeof simulations.$inferInsert;

// ---  Messages (inbound WhatsApp audit log) ---

export const messages = mysqlTable('messages', {
    messageSid: varchar('message_sid', { length: 64 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    fromPhoneHash: varchar('from_phone_hash', { length: 64 }).notNull(),
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

export const frankTokenUsage = mysqlTable('frank_token_usage', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    tokens: int('tokens').notNull().default(0),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    tenantDateUniqueIdx: uniqueIndex('idx_frank_token_usage_tenant_date').on(table.tenantId, table.date),
}));

export type FrankTokenUsageRecord = typeof frankTokenUsage.$inferSelect;
export type NewFrankTokenUsageRecord = typeof frankTokenUsage.$inferInsert;

// --- Frank Playbooks (Internal FAQ/Responses) ---

export const frankPlaybooks = mysqlTable('frank_playbooks', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    intent: varchar('intent', { length: 50 }).notNull(),
    triggerPhrases: json('trigger_phrases').$type<string[]>(),
    relatedEntities: json('related_entities').$type<string[]>(),
    responseBase: text('response_base').notNull(),
    responseShort: text('response_short'),
    nextStepSuggestion: text('next_step_suggestion'),
    requiresConfirmation: boolean('requires_confirmation').notNull().default(false),
    requiresHumanHandoff: boolean('requires_human_handoff').notNull().default(false),
    handoffConditions: text('handoff_conditions'),
    tags: json('tags').$type<string[]>(),
    status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, approved, archived
    priority: int('priority').notNull().default(0),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => {
    return {
        tenantIdIntentStatusIdx: index('idx_frank_playbooks_tenant_intent_status').on(table.tenantId, table.intent, table.status),
    };
});

export type FrankPlaybookRecord = typeof frankPlaybooks.$inferSelect;
export type NewFrankPlaybookRecord = typeof frankPlaybooks.$inferInsert;

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

// --- Idempotency Layer ---

export const idempotencyRequests = mysqlTable('idempotency_requests', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 120 }).notNull(),
    route: varchar('route', { length: 255 }).notNull(),
    tenantId: varchar('tenant_id', { length: 120 }),
    responseStatus: int('response_status'),
    responseBody: json('response_body'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
}, (table) => {
    return {
        idempotencyKeyRouteUnique: uniqueIndex('uniq_idem_key_route').on(table.idempotencyKey, table.route),
    };
});

export type IdempotencyRequestRecord = typeof idempotencyRequests.$inferSelect;
export type NewIdempotencyRequestRecord = typeof idempotencyRequests.$inferInsert;

// --- Telemetry (Security) ---

export const securityEdgeEvents = mysqlTable('security_edge_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    requestId: varchar('request_id', { length: 64 }).notNull(),
    route: varchar('route', { length: 255 }).notNull(),
    reason: varchar('reason', { length: 100 }).notNull(),
    ipHash: varchar('ip_hash', { length: 64 }),
    tenantClaim: varchar('tenant_claim', { length: 36 }),
    userClaim: varchar('user_claim', { length: 36 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        createdAtRouteIndex: index('idx_sec_edge_events_created_at_route').on(table.createdAt, table.route),
        tenantIndex: index('idx_sec_edge_events_tenant').on(table.tenantClaim),
    };
});

export type SecurityEdgeEventRecord = typeof securityEdgeEvents.$inferSelect;
export type NewSecurityEdgeEventRecord = typeof securityEdgeEvents.$inferInsert;

export const securityIncidents = mysqlTable('security_incidents', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    reason: varchar('reason', { length: 100 }).notNull(),
    count: int('count').notNull(),
    route: varchar('route', { length: 255 }),
    ipHash: varchar('ip_hash', { length: 64 }),
    windowStart: timestamp('window_start').notNull(),
    windowEnd: timestamp('window_end').notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        createdAtIdx: index('idx_sec_incidents_created_at').on(table.createdAt),
        reasonWindowIdx: index('idx_sec_incidents_reason_window').on(table.reason, table.windowEnd),
    };
});

export type SecurityIncidentRecord = typeof securityIncidents.$inferSelect;
export type NewSecurityIncidentRecord = typeof securityIncidents.$inferInsert;

// --- Users (Authentication) ---

export const users = mysqlTable('users', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    passwordHash: varchar('password_hash', { length: 512 }),
    authProvider: varchar('auth_provider', { length: 20 }).notNull().default('email'),
    providerId: varchar('provider_id', { length: 255 }),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('operator'),
    sessionVersion: int('session_version').notNull().default(1),
    emailVerifyToken: varchar('email_verify_token', { length: 128 }),
    emailVerifiedAt: timestamp('email_verified_at'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        providerIdUnique: uniqueIndex('idx_users_provider_id_unique').on(table.authProvider, table.providerId),
    };
});

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;

// --- Invites ---

export const invites = mysqlTable('invites', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    token: varchar('token', { length: 128 }).notNull().unique(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(),
    email: varchar('email', { length: 255 }),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdBy: varchar('created_by', { length: 36 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type InviteRecord = typeof invites.$inferSelect;
export type NewInviteRecord = typeof invites.$inferInsert;

// --- Tenant Signup Policies ---

export const tenantSignupPolicies = mysqlTable('tenant_signup_policies', {
    tenantId: varchar('tenant_id', { length: 36 }).primaryKey().notNull(),
    selfSignupEnabled: boolean('self_signup_enabled').notNull().default(false),
    allowedDomains: json('allowed_domains').$type<string[]>().$defaultFn(() => []),
    allowedEmails: json('allowed_emails').$type<string[]>().$defaultFn(() => []),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type TenantSignupPolicyRecord = typeof tenantSignupPolicies.$inferSelect;

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
    tenantId: varchar('tenant_id', { length: 36 }),
    anonId: varchar('anon_id', { length: 128 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    attributionId: varchar('attribution_id', { length: 36 }),
    payloadJson: json('payload_json'),
    ipHash: varchar('ip_hash', { length: 64 }),
    uaHash: varchar('ua_hash', { length: 64 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        tenantTimeIdx: index('idx_public_events_tenant_created_at').on(table.tenantId, table.createdAt),
        eventTimeIdx: index('idx_public_events_event_time').on(table.eventType, table.createdAt),
        anonIdTimeIdx: index('idx_public_events_anon_time').on(table.anonId, table.createdAt),
        attributionIdIdx: index('idx_public_events_attribution_id').on(table.attributionId),
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
    tenantId: varchar('tenant_id', { length: 36 }),
    userId: varchar('user_id', { length: 36 }),
    actorType: varchar('actor_type', { length: 20 }).notNull().default('user'),
    action: varchar('action', { length: 64 }).notNull(),
    scope: varchar('scope', { length: 64 }),
    requestId: varchar('request_id', { length: 64 }),
    payloadHash: varchar('payload_hash', { length: 64 }),
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
    eventId: varchar('event_id', { length: 128 }).notNull(), // messageSid/eventId
    eventType: varchar('event_type', { length: 128 }).notNull(),
    receivedAt: timestamp('received_at').notNull(),
    payloadHash: varchar('payload_hash', { length: 128 }).notNull(),
    processedAt: timestamp('processed_at'),
    status: varchar('status', { length: 32 }).notNull(), // 'received' | 'processed' | 'failed'
}, (table) => ({
    providerEventIdx: uniqueIndex('idx_webhook_events_provider_event').on(table.provider, table.eventId),
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
    status: varchar('status', { length: 30 }).notNull().default('queued'), // queued | processing | completed | failed | dead_letter
    retryCount: int('retry_count').notNull().default(0),
    nextRetryAt: timestamp('next_retry_at'),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantIdempotencyIdx: uniqueIndex('uq_domine_events_tenant_idempotency').on(table.tenantId, table.idempotencyKey),
    tenantStatusIdx: index('idx_domine_events_tenant_status').on(table.tenantId, table.status),
    nextRetryIdx: index('idx_domine_events_next_retry').on(table.status, table.nextRetryAt),
}));

export const domineTenantIntakeConfigs = mysqlTable('domine_tenant_intake_configs', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    tenantKey: varchar('tenant_key', { length: 128 }).notNull(),
    secret: varchar('secret', { length: 255 }),
    allowUnsignedIntake: boolean('allow_unsigned_intake').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    tenantKeyIdx: uniqueIndex('uq_domine_tenant_intake_configs_key').on(table.tenantKey),
    tenantIdIdx: index('idx_domine_tenant_intake_configs_tenant').on(table.tenantId),
}));

export const domineIntakeEvents = mysqlTable('domine_intake_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    source: varchar('source', { length: 50 }).notNull(),
    eventType: varchar('event_type', { length: 128 }).notNull(),
    externalId: varchar('external_id', { length: 128 }).notNull(),
    occurredAt: timestamp('occurred_at').notNull(),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
    payloadRedacted: json('payload_redacted'),
    status: varchar('status', { length: 30 }).notNull().default('queued'), // queued | rejected | duplicate
    rejectionReason: text('rejection_reason'),
}, (table) => ({
    idempotencyIdx: uniqueIndex('uq_domine_intake_events_idempotency').on(table.tenantId, table.source, table.eventType, table.externalId),
    tenantStatusIdx: index('idx_domine_intake_events_tenant_status').on(table.tenantId, table.status),
}));

export const domineEventsDlq = mysqlTable('domine_events_dlq', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    eventId: varchar('event_id', { length: 36 }).notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    eventType: varchar('event_type', { length: 128 }).notNull(),
    payloadJson: json('payload_json'),
    failureReason: text('failure_reason').notNull(),
    retryCount: int('retry_count').notNull().default(0),
    failedAt: timestamp('failed_at').defaultNow().notNull(),
}, (table) => ({
    tenantIdx: index('idx_domine_events_dlq_tenant').on(table.tenantId),
    failedAtIdx: index('idx_domine_events_dlq_failed_at').on(table.failedAt),
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
    correlationId: varchar('correlation_id', { length: 100 }).notNull(),
    requestId: varchar('request_id', { length: 100 }),
    source: varchar('source', { length: 50 }).notNull(),
    originZip: varchar('origin_zip', { length: 20 }),
    destZip: varchar('dest_zip', { length: 20 }),
    weight: int('weight'),
    dims: varchar('dims', { length: 100 }),
    quotesJsonRedacted: json('quotes_json_redacted'),
    bestCarrier: varchar('best_carrier', { length: 100 }),
    bestPriceCents: int('best_price_cents'),
    bestEtaDays: int('best_eta_days'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantCorrelationIdx: uniqueIndex('uq_domine_freight_quotes_correlation').on(table.tenantId, table.correlationId),
}));

export type DomineEventRecord = typeof domineEvents.$inferSelect;
export type NewDomineEventRecord = typeof domineEvents.$inferInsert;
export type DomineOrderRecord = typeof domineOrders.$inferSelect;
export type NewDomineOrderRecord = typeof domineOrders.$inferInsert;
export type DomineFreightQuoteRecord = typeof domineFreightQuotes.$inferSelect;
export type NewDomineFreightQuoteRecord = typeof domineFreightQuotes.$inferInsert;

// --- LGPD Consent Engine ---

export const endUserConsents = mysqlTable('end_user_consents', {
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    phoneHash: varchar('phone_hash', { length: 64 }).notNull(),
    consentGiven: boolean('consent_given').notNull().default(false),
    consentTimestamp: timestamp('consent_timestamp'),
    consentSource: varchar('consent_source', { length: 50 }),
    blockedAttempts: int('blocked_attempts').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.tenantId, table.phoneHash], name: 'pk_end_user_consents' }),
}));

export const userConsentsLog = mysqlTable('user_consents_log', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    phoneHash: varchar('phone_hash', { length: 64 }).notNull(),
    consentGiven: boolean('consent_given').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    ipHash: varchar('ip_hash', { length: 64 }),
    source: varchar('source', { length: 50 }),
}, (table) => ({
    tenantPhoneIdx: index('idx_user_consents_log_tenant_phone').on(table.tenantId, table.phoneHash),
}));

export type EndUserConsentRecord = typeof endUserConsents.$inferSelect;
export type NewEndUserConsentRecord = typeof endUserConsents.$inferInsert;
export type UserConsentsLogRecord = typeof userConsentsLog.$inferSelect;
export type NewUserConsentsLogRecord = typeof userConsentsLog.$inferInsert;

// --- Central do Comprador (Customer Central Foundation) ---

export const organizations = mysqlTable('organizations', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    legalName: varchar('legal_name', { length: 255 }).notNull(),
    tradeName: varchar('trade_name', { length: 255 }),
    cnpjHash: varchar('cnpj_hash', { length: 64 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    purgeAt: timestamp('purge_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantIdIndex: index('idx_organizations_tenant_id').on(table.tenantId),
    cnpjHashIndex: index('idx_organizations_cnpj_hash').on(table.cnpjHash),
}));

export const sites = mysqlTable('sites', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    addressRedacted: text('address_redacted'),
    purgeAt: timestamp('purge_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    orgIndex: index('idx_sites_organization_id').on(table.organizationId),
}));

export const customerAccounts = mysqlTable('customer_accounts', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(), // OWNER | MANAGER | EMPLOYEE
    status: varchar('status', { length: 50 }).notNull().default('active'),
    purgeAt: timestamp('purge_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    userIndex: index('idx_customer_accounts_user_id').on(table.userId),
    orgIndex: index('idx_customer_accounts_organization_id').on(table.organizationId),
}));

export const customerTimelineEvents = mysqlTable('customer_timeline_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // QUOTE | ORDER | SHIPMENT | INVOICE | SUPPORT
    entityId: varchar('entity_id', { length: 128 }).notNull(),
    status: varchar('status', { length: 100 }).notNull(),
    messagePublic: text('message_public').notNull(),
    metadataJson: json('metadata_json'),
    purgeAt: timestamp('purge_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantOrgCreatedIdx: index('idx_customer_timeline_tenant_org_created').on(table.tenantId, table.organizationId, table.createdAt),
    entityIdx: index('idx_customer_timeline_entity').on(table.entityType, table.entityId),
}));

export const deliveryProofs = mysqlTable('delivery_proofs', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    shipmentId: varchar('shipment_id', { length: 128 }).notNull(),
    photoUrl: text('photo_url'),
    receiverName: varchar('receiver_name', { length: 255 }),
    signedAt: timestamp('signed_at'),
    geoHash: varchar('geo_hash', { length: 64 }),
    metadataJson: json('metadata_json'),
    purgeAt: timestamp('purge_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    shipmentIdx: index('idx_delivery_proofs_shipment_id').on(table.shipmentId),
}));

export const invoices = mysqlTable('invoices', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    orderId: varchar('order_id', { length: 128 }),
    amountCents: int('amount_cents').notNull(),
    dueDate: timestamp('due_date').notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    boletoUrl: text('boleto_url'),
    purgeAt: timestamp('purge_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    orgIdx: index('idx_invoices_organization_id').on(table.organizationId),
}));

// --- New Canonical CRM ---

export const customers = mysqlTable('customers', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }).notNull(),
    segment: varchar('segment', { length: 50 }),
    status: varchar('status', { length: 50 }).notNull().default('ativo'),
    ownerId: varchar('owner_id', { length: 36 }),
    activityBucket: varchar('activity_bucket', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    tenantOrgUnique: uniqueIndex('uq_customers_tenant_org').on(table.tenantId, table.organizationId),
}));

export const customerContacts = mysqlTable('customer_contacts', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    customerId: varchar('customer_id', { length: 36 }).notNull(),
    organizationId: varchar('organization_id', { length: 36 }),
    name: varchar('name', { length: 255 }).notNull(),
    emailHash: varchar('email_hash', { length: 64 }),
    emailEncrypted: varchar('email_encrypted', { length: 255 }),
    phoneHash: varchar('phone_hash', { length: 64 }),
    phoneEncrypted: varchar('phone_encrypted', { length: 255 }),
    role: varchar('role', { length: 100 }),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    tenantCustomerIdx: index('idx_customer_contacts_tenant_customer').on(table.tenantId, table.customerId),
    phoneHashIdx: index('idx_customer_contacts_phone_hash').on(table.phoneHash),
    tenantPhoneIdx: index('idx_customer_contacts_tenant_phone').on(table.tenantId, table.phoneHash),
}));

// --- New Canonical Orders ---

export const orders = mysqlTable('orders', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    customerId: varchar('customer_id', { length: 36 }),
    organizationId: varchar('organization_id', { length: 36 }),
    conversationId: varchar('conversation_id', { length: 36 }),
    quoteId: varchar('quote_id', { length: 36 }),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // DRAFT, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELED
    priority: varchar('priority', { length: 50 }).notNull().default('media'),
    channel: varchar('channel', { length: 50 }),
    carrier: varchar('carrier', { length: 100 }),
    service: varchar('service', { length: 100 }),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
    price: decimal('price', { precision: 10, scale: 2 }),
    deliveryDeadline: int('delivery_deadline'),
    createdBy: varchar('created_by', { length: 36 }),
    ownerId: varchar('owner_id', { length: 36 }),
    freightSimulationId: varchar('freight_simulation_id', { length: 36 }),
    freightConfirmationId: varchar('freight_confirmation_id', { length: 36 }),
    logisticsStatus: varchar('logistics_status', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    tenantCustomerIdx: index('idx_orders_tenant_customer').on(table.tenantId, table.customerId),
    tenantStatusIdx: index('idx_orders_tenant_status').on(table.tenantId, table.status),
    tenantQuoteUniqueIdx: uniqueIndex('idx_orders_tenant_quote_unique').on(table.tenantId, table.quoteId),
    tenantCreatedIdx: index('idx_orders_tenant_created_at').on(table.tenantId, table.createdAt),
    tenantConversationIdx: index('idx_orders_tenant_conversation').on(table.tenantId, table.conversationId),
}));

export type OrderRecord = typeof orders.$inferSelect;
export type NewOrderRecord = typeof orders.$inferInsert;

export const orderItems = mysqlTable('order_items', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    orderId: varchar('order_id', { length: 36 }).notNull(),
    sku: varchar('sku', { length: 100 }),
    name: varchar('name', { length: 255 }).notNull(),
    quantity: int('quantity').notNull().default(1),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }),
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantOrderIdx: index('idx_order_items_tenant_order').on(table.tenantId, table.orderId),
}));

export const orderStatusHistory = mysqlTable('order_status_history', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    orderId: varchar('order_id', { length: 36 }).notNull(),
    previousStatus: varchar('previous_status', { length: 50 }),
    newStatus: varchar('new_status', { length: 50 }).notNull(),
    reason: varchar('reason', { length: 255 }),
    changedBy: varchar('changed_by', { length: 36 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantOrderIdx: index('idx_order_status_history_tenant_order').on(table.tenantId, table.orderId),
}));

export type OrganizationRecord = typeof organizations.$inferSelect;
export type NewOrganizationRecord = typeof organizations.$inferInsert;
export type SiteRecord = typeof sites.$inferSelect;
export type NewSiteRecord = typeof sites.$inferInsert;
export type CustomerAccountRecord = typeof customerAccounts.$inferSelect;
export type NewCustomerAccountRecord = typeof customerAccounts.$inferInsert;
export type CustomerTimelineEventRecord = typeof customerTimelineEvents.$inferSelect;
export type NewCustomerTimelineEventRecord = typeof customerTimelineEvents.$inferInsert;
export type DeliveryProofRecord = typeof deliveryProofs.$inferSelect;
export type NewDeliveryProofRecord = typeof deliveryProofs.$inferInsert;
export type InvoiceRecord = typeof invoices.$inferSelect;
export type NewInvoiceRecord = typeof invoices.$inferInsert;
export type CustomerRecord = typeof customers.$inferSelect;
export type NewCustomerRecord = typeof customers.$inferInsert;
export type CustomerContactRecord = typeof customerContacts.$inferSelect;
export type NewCustomerContactRecord = typeof customerContacts.$inferInsert;
export type OrderCrmRecord = typeof orders.$inferSelect;
export type NewOrderCrmRecord = typeof orders.$inferInsert;
export type OrderItemRecord = typeof orderItems.$inferSelect;
export type NewOrderItemRecord = typeof orderItems.$inferInsert;
export type OrderStatusHistoryRecord = typeof orderStatusHistory.$inferSelect;
export type NewOrderStatusHistoryRecord = typeof orderStatusHistory.$inferInsert;

// --- Canonical Products (Catalog) ---

export const products = mysqlTable('products', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    weight: decimal('weight', { precision: 10, scale: 3 }).notNull(), // in kg
    width: decimal('width', { precision: 10, scale: 2 }), // in cm
    height: decimal('height', { precision: 10, scale: 2 }), // in cm
    length: decimal('length', { precision: 10, scale: 2 }), // in cm
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    tenantIdx: index('idx_products_tenant').on(table.tenantId),
}));

export type ProductRecord = typeof products.$inferSelect;
export type NewProductRecord = typeof products.$inferInsert;

// --- Delivery Tracking (Entregador GPS) ---

export const couriers = mysqlTable('couriers', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    phoneHash: varchar('phone_hash', { length: 64 }).notNull(),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantIdx: index('idx_couriers_tenant').on(table.tenantId),
    phoneHashIdx: index('idx_couriers_phone_hash').on(table.phoneHash),
}));

export type CourierRecord = typeof couriers.$inferSelect;
export type NewCourierRecord = typeof couriers.$inferInsert;

export const deliveries = mysqlTable('deliveries', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    orderRef: varchar('order_ref', { length: 128 }).notNull(),
    courierId: varchar('courier_id', { length: 36 }),
    status: varchar('status', { length: 50 }).default('created').notNull(), // created, assigned, enroute, delivered, cancelled
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    lastLat: decimal('last_lat', { precision: 10, scale: 8 }),
    lastLng: decimal('last_lng', { precision: 11, scale: 8 }),
    lastUpdateAt: timestamp('last_update_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantStatusIdx: index('idx_deliveries_tenant_status').on(table.tenantId, table.status),
    courierIdx: index('idx_deliveries_courier_id').on(table.courierId),
    tenantOrderIdx: index('idx_deliveries_tenant_order').on(table.tenantId, table.orderRef),
}));

export type DeliveryRecord = typeof deliveries.$inferSelect;
export type NewDeliveryRecord = typeof deliveries.$inferInsert;

export const deliveryLocationEvents = mysqlTable('delivery_location_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    deliveryId: varchar('delivery_id', { length: 36 }).notNull(),
    lat: decimal('lat', { precision: 10, scale: 8 }).notNull(),
    lng: decimal('lng', { precision: 11, scale: 8 }).notNull(),
    accuracy: int('accuracy'), // in meters
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
}, (table) => ({
    deliveryTimeIdx: index('idx_delivery_location_events_delivery_time').on(table.deliveryId, table.recordedAt),
}));

export type DeliveryLocationEventRecord = typeof deliveryLocationEvents.$inferSelect;
export type NewDeliveryLocationEventRecord = typeof deliveryLocationEvents.$inferInsert;

export const userUiPrefs = mysqlTable('user_ui_prefs', {
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    key: varchar('key', { length: 100 }).notNull(),
    payloadJson: json('payload_json').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.tenantId, table.userId, table.key] }),
    tenantUserIdx: index('idx_user_ui_prefs_tenant_user').on(table.tenantId, table.userId),
}));

export type UserUiPrefRecord = typeof userUiPrefs.$inferSelect;
export type NewUserUiPrefRecord = typeof userUiPrefs.$inferInsert;

// --- Tenant Data Contract Status ---

export const tenantDataContractStatus = mysqlTable('tenant_data_contract_status', {
    tenantId: varchar('tenant_id', { length: 36 }).primaryKey().notNull(),
    acquisitionReady: boolean('acquisition_ready').notNull().default(false),
    conversionReady: boolean('conversion_ready').notNull().default(false),
    revenueReady: boolean('revenue_ready').notNull().default(false),
    retentionReady: boolean('retention_ready').notNull().default(false),
    operationalReady: boolean('operational_ready').notNull().default(false),
    lastCheckedAt: timestamp('last_checked_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type TenantDataContractStatusRecord = typeof tenantDataContractStatus.$inferSelect;
export type NewTenantDataContractStatusRecord = typeof tenantDataContractStatus.$inferInsert;

// --- Tenant Supreme Permissions ---

export const tenantSupremePermissions = mysqlTable('tenant_supreme_permissions', {
    tenantId: varchar('tenant_id', { length: 36 }).primaryKey().notNull(),
    allowReadMetrics: boolean('allow_read_metrics').notNull().default(true),
    allowGenerateRecommendations: boolean('allow_generate_recommendations').notNull().default(true),
    allowExecuteOptimizations: boolean('allow_execute_optimizations').notNull().default(false),
    allowAdsBudgetChanges: boolean('allow_ads_budget_changes').notNull().default(false),
    allowCrmActions: boolean('allow_crm_actions').notNull().default(false),
    allowWhatsappAutomation: boolean('allow_whatsapp_automation').notNull().default(true),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type TenantSupremePermissionsRecord = typeof tenantSupremePermissions.$inferSelect;
export type NewTenantSupremePermissionsRecord = typeof tenantSupremePermissions.$inferInsert;

// --- Operational Events ---

export const operationalEvents = mysqlTable('operational_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    eventType: varchar('event_type', { length: 80 }).notNull(),
    eventDomain: varchar('event_domain', { length: 40 }).notNull(),
    entityId: varchar('entity_id', { length: 120 }),
    customerId: varchar('customer_id', { length: 120 }),
    sessionId: varchar('session_id', { length: 120 }),
    attributionId: varchar('attribution_id', { length: 120 }),
    payload: json('payload').notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxDomainTime: index('idx_op_events_tenant_domain_time').on(table.tenantId, table.eventDomain, table.createdAt),
    idxTypeTime: index('idx_op_events_tenant_type_time').on(table.tenantId, table.eventType, table.createdAt),
    idxCustomerTime: index('idx_op_events_tenant_customer_time').on(table.tenantId, table.customerId, table.createdAt),
    idxTenantTime: index('idx_op_events_tenant_time').on(table.tenantId, table.createdAt),
}));

export type OperationalEventRecord = typeof operationalEvents.$inferSelect;
export type NewOperationalEventRecord = typeof operationalEvents.$inferInsert;

// --- Supreme Actions ---

export const supremeActions = mysqlTable('supreme_actions', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    actionType: varchar('action_type', { length: 80 }).notNull(),
    actionScope: varchar('action_scope', { length: 40 }).notNull(),
    status: varchar('status', { length: 40 }).notNull().default('PROPOSED'),
    proposedBy: varchar('proposed_by', { length: 40 }).notNull(),
    approvedBy: varchar('approved_by', { length: 120 }),
    executedBy: varchar('executed_by', { length: 40 }),
    payload: json('payload').notNull().$type<Record<string, unknown>>(),
    result: json('result').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    approvedAt: timestamp('approved_at'),
    executedAt: timestamp('executed_at'),
}, (table) => ({
    idxStatusTime: index('idx_sa_tenant_status_time').on(table.tenantId, table.status, table.createdAt),
    idxTypeTime: index('idx_sa_tenant_type_time').on(table.tenantId, table.actionType, table.createdAt),
}));

export type SupremeActionRecord = typeof supremeActions.$inferSelect;
export type NewSupremeActionRecord = typeof supremeActions.$inferInsert;

// --- Supreme Findings ---

export const supremeFindings = mysqlTable('supreme_findings', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    findingType: varchar('finding_type', { length: 80 }).notNull(),
    findingDomain: varchar('finding_domain', { length: 40 }).notNull(),
    severity: varchar('severity', { length: 20 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    summary: text('summary').notNull(),
    evidence: json('evidence').notNull().$type<Record<string, unknown>>(),
    recommendedActionType: varchar('recommended_action_type', { length: 80 }),
    recommendedActionPayload: json('recommended_action_payload').$type<Record<string, unknown>>(),
    status: varchar('status', { length: 40 }).notNull().default('OPEN'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    resolvedAt: timestamp('resolved_at'),
}, (table) => ({
    idxStatusTime: index('idx_sf_tenant_status_time').on(table.tenantId, table.status, table.createdAt),
    idxDomainTime: index('idx_sf_tenant_domain_time').on(table.tenantId, table.findingDomain, table.createdAt),
    idxSeverityTime: index('idx_sf_tenant_severity_time').on(table.tenantId, table.severity, table.createdAt),
}));

export type SupremeFindingRecord = typeof supremeFindings.$inferSelect;
export type NewSupremeFindingRecord = typeof supremeFindings.$inferInsert;

// --- Supreme Playbooks ---

export const supremePlaybooks = mysqlTable('supreme_playbooks', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    playbookName: varchar('playbook_name', { length: 120 }).notNull(),
    playbookDomain: varchar('playbook_domain', { length: 40 }).notNull(),
    triggerFindingType: varchar('trigger_finding_type', { length: 80 }).notNull(),
    actionSequence: json('action_sequence').notNull().$type<Array<{ action: string; delay_minutes: number; payloadTemplate?: Record<string, unknown> }>>(),
    expectedMetric: varchar('expected_metric', { length: 80 }).notNull(),
    successThreshold: double('success_threshold').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxDomain: index('idx_sp_domain').on(table.playbookDomain),
    idxTrigger: index('idx_sp_trigger').on(table.triggerFindingType),
}));

export type SupremePlaybookRecord = typeof supremePlaybooks.$inferSelect;
export type NewSupremePlaybookRecord = typeof supremePlaybooks.$inferInsert;

// --- Supreme Benchmarks ---

export const supremeBenchmarks = mysqlTable('supreme_benchmarks', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    benchmarkDomain: varchar('benchmark_domain', { length: 40 }).notNull(),
    benchmarkMetric: varchar('benchmark_metric', { length: 80 }).notNull(),
    segmentKey: varchar('segment_key', { length: 120 }).notNull(),
    sampleSize: int('sample_size').notNull(),
    p25: double('p25'),
    p50: double('p50'),
    p75: double('p75'),
    computedAt: timestamp('computed_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxDomainMetricSegment: index('idx_sb_domain_metric_segment').on(table.benchmarkDomain, table.benchmarkMetric, table.segmentKey),
    idxComputedAt: index('idx_sb_computed_at').on(table.computedAt),
}));

export type SupremeBenchmarkRecord = typeof supremeBenchmarks.$inferSelect;
export type NewSupremeBenchmarkRecord = typeof supremeBenchmarks.$inferInsert;

// --- Packing Profiles (Freight Intelligence) ---

export const packingProfiles = mysqlTable('packing_profiles', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    productRef: varchar('product_ref', { length: 128 }),
    profileName: varchar('profile_name', { length: 255 }).notNull(),
    baseHeight: decimal('base_height', { precision: 10, scale: 2 }).notNull().default('0'),
    baseWidth: decimal('base_width', { precision: 10, scale: 2 }).notNull().default('0'),
    baseLength: decimal('base_length', { precision: 10, scale: 2 }).notNull().default('0'),
    baseWeight: decimal('base_weight', { precision: 10, scale: 3 }).notNull().default('0'),
    packingMode: varchar('packing_mode', { length: 20 }).notNull().default('SINGLE_FIXED'),
    stackable: boolean('stackable').notNull().default(false),
    nestable: boolean('nestable').notNull().default(false),
    requiresOwnBox: boolean('requires_own_box').notNull().default(false),
    heightIncrementPerExtraUnit: decimal('height_increment_per_extra_unit', { precision: 10, scale: 2 }).notNull().default('0'),
    widthIncrementPerExtraUnit: decimal('width_increment_per_extra_unit', { precision: 10, scale: 2 }).notNull().default('0'),
    lengthIncrementPerExtraUnit: decimal('length_increment_per_extra_unit', { precision: 10, scale: 2 }).notNull().default('0'),
    maxUnitsPerVolume: int('max_units_per_volume').notNull().default(1),
    reviewStatus: varchar('review_status', { length: 20 }).notNull().default('DRAFT'),
    isActive: boolean('is_active').notNull().default(false),
    source: varchar('source', { length: 20 }).notNull().default('MANUAL'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    idxTenantId: index('idx_packing_profiles_tenant_id').on(table.tenantId),
    idxTenantReviewStatus: index('idx_packing_profiles_tenant_review').on(table.tenantId, table.reviewStatus),
    idxTenantActive: index('idx_packing_profiles_tenant_active').on(table.tenantId, table.isActive),
}));

export type PackingProfileRecord = typeof packingProfiles.$inferSelect;
export type NewPackingProfileRecord = typeof packingProfiles.$inferInsert;

// --- Carrier Policies (Freight Table Engine) ---

export const carrierPolicies = mysqlTable('carrier_policies', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    carrierName: varchar('carrier_name', { length: 60 }).notNull(),
    originCity: varchar('origin_city', { length: 80 }),
    originState: varchar('origin_state', { length: 2 }),
    cubageFactor: decimal('cubage_factor', { precision: 8, scale: 2 }).notNull().default('300'),
    weightThresholdExcess: decimal('weight_threshold_excess', { precision: 8, scale: 2 }),
    deliveryTimeDaysBase: int('delivery_time_days_base').notNull().default(7),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    idxTenantCarrier: index('idx_carrier_policies_tenant_carrier').on(table.tenantId, table.carrierName),
}));

export type CarrierPolicyRecord = typeof carrierPolicies.$inferSelect;
export type NewCarrierPolicyRecord = typeof carrierPolicies.$inferInsert;

// --- Carrier Zones ---

export const carrierZones = mysqlTable('carrier_zones', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    carrierName: varchar('carrier_name', { length: 60 }).notNull(),
    zoneCode: varchar('zone_code', { length: 20 }).notNull(),
    regionName: varchar('region_name', { length: 80 }),
    capitalOrInterior: varchar('capital_or_interior', { length: 10 }),
    state: varchar('state', { length: 2 }),
    cepRangeStart: varchar('cep_range_start', { length: 8 }),
    cepRangeEnd: varchar('cep_range_end', { length: 8 }),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxTenantCarrierZone: index('idx_carrier_zones_tenant_carrier_zone').on(table.tenantId, table.carrierName, table.zoneCode),
    idxTenantCarrierState: index('idx_carrier_zones_tenant_carrier_state').on(table.tenantId, table.carrierName, table.state),
}));

export type CarrierZoneRecord = typeof carrierZones.$inferSelect;
export type NewCarrierZoneRecord = typeof carrierZones.$inferInsert;

// --- Carrier Rate Rows ---

export const carrierRateRows = mysqlTable('carrier_rate_rows', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    carrierName: varchar('carrier_name', { length: 60 }).notNull(),
    zoneCode: varchar('zone_code', { length: 20 }).notNull(),
    weightBandMax: decimal('weight_band_max', { precision: 10, scale: 2 }).notNull(),
    basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
    excessKgPrice: decimal('excess_kg_price', { precision: 10, scale: 4 }),
    advPercent: decimal('adv_percent', { precision: 6, scale: 4 }),
    advMin: decimal('adv_min', { precision: 10, scale: 2 }),
    grisPercent: decimal('gris_percent', { precision: 6, scale: 4 }),
    grisMin: decimal('gris_min', { precision: 10, scale: 2 }),
    tasValue: decimal('tas_value', { precision: 10, scale: 2 }),
    trtPercent: decimal('trt_percent', { precision: 6, scale: 4 }),
    trtMin: decimal('trt_min', { precision: 10, scale: 2 }),
    pedagioValue: decimal('pedagio_value', { precision: 10, scale: 2 }),
    pedagioFractionKg: decimal('pedagio_fraction_kg', { precision: 10, scale: 2 }),
    emexValue: decimal('emex_value', { precision: 10, scale: 2 }),
    emexPercent: decimal('emex_percent', { precision: 6, scale: 4 }),
    txaValue: decimal('txa_value', { precision: 10, scale: 2 }),
    fpkValue: decimal('fpk_value', { precision: 10, scale: 2 }),
    fvPercent: decimal('fv_percent', { precision: 6, scale: 4 }),
    deliveryTimeDays: int('delivery_time_days'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxTenantCarrierZone: index('idx_carrier_rate_rows_tenant_carrier_zone').on(table.tenantId, table.carrierName, table.zoneCode),
    idxTenantCarrierZoneWeight: index('idx_carrier_rate_rows_lookup').on(table.tenantId, table.carrierName, table.zoneCode, table.weightBandMax),
}));

export type CarrierRateRowRecord = typeof carrierRateRows.$inferSelect;
export type NewCarrierRateRowRecord = typeof carrierRateRows.$inferInsert;

// --- Freight Operational Settings (cockpit-editable) ---

export const freightOperationalSettings = mysqlTable('freight_operational_settings', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    settingKey: varchar('setting_key', { length: 100 }).notNull(),
    settingValue: varchar('setting_value', { length: 500 }).notNull(),
    description: varchar('description', { length: 250 }),
    category: varchar('category', { length: 50 }).notNull().default('packing'),
    ruleVersion: int('rule_version').notNull().default(1),
    activeFrom: timestamp('active_from').default(sql`CURRENT_TIMESTAMP`).notNull(),
    activeTo: timestamp('active_to'),
    isActive: boolean('is_active').notNull().default(true),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxTenantKey: index('idx_freight_ops_settings_tenant_key').on(table.tenantId, table.settingKey),
}));

export type FreightOperationalSettingRecord = typeof freightOperationalSettings.$inferSelect;

// --- Carrier Priority Rules ---

export const carrierPriorityRules = mysqlTable('carrier_priority_rules', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    regionGroup: varchar('region_group', { length: 40 }).notNull(),
    carrierName: varchar('carrier_name', { length: 60 }).notNull(),
    priorityOrder: int('priority_order').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    idxTenantRegion: index('idx_carrier_priority_tenant_region').on(table.tenantId, table.regionGroup),
}));

export type CarrierPriorityRuleRecord = typeof carrierPriorityRules.$inferSelect;

// --- Freight Simulations (Audit Log) ---

export const freightSimulations = mysqlTable('freight_simulations', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    cep: varchar('cep', { length: 10 }).notNull(),
    cepPrefix: varchar('cep_prefix', { length: 5 }).notNull(),
    zoneCode: varchar('zone_code', { length: 30 }),
    carrierConsidered: json('carrier_considered').$type<string[]>(),
    carrierSelected: varchar('carrier_selected', { length: 60 }),
    productHash: varchar('product_hash', { length: 64 }),
    productRefs: json('product_refs').$type<string[]>(),
    productFamily: json('product_family').$type<string[]>(),
    totalWeight: decimal('total_weight', { precision: 10, scale: 2 }).notNull(),
    cubedWeight: decimal('cubed_weight', { precision: 10, scale: 2 }),
    chargedWeight: decimal('charged_weight', { precision: 10, scale: 2 }).notNull(),
    totalVolumes: int('total_volumes').notNull().default(1),
    volumeDetails: json('volume_details'),
    dimensionSource: varchar('dimension_source', { length: 30 }),
    packingRuleVersion: int('packing_rule_version'),
    quotedFreight: decimal('quoted_freight', { precision: 10, scale: 2 }),
    breakdownJson: json('breakdown_json'),
    strategyUsed: varchar('strategy_used', { length: 30 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxTenantCep: index('idx_freight_sim_tenant_cep').on(table.tenantId, table.cepPrefix),
    idxTenantCreated: index('idx_freight_sim_tenant_created').on(table.tenantId, table.createdAt),
}));

export type FreightSimulationRecord = typeof freightSimulations.$inferSelect;

// --- Freight Confirmations ---

export const freightConfirmations = mysqlTable('freight_confirmations', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    simulationId: varchar('simulation_id', { length: 36 }),
    orderId: varchar('order_id', { length: 36 }),
    cep: varchar('cep', { length: 10 }).notNull(),
    cepPrefix: varchar('cep_prefix', { length: 5 }).notNull(),
    zoneCode: varchar('zone_code', { length: 30 }),
    carrierName: varchar('carrier_name', { length: 60 }).notNull(),
    productHash: varchar('product_hash', { length: 64 }),
    productFamily: json('product_family').$type<string[]>(),
    totalWeight: decimal('total_weight', { precision: 10, scale: 2 }).notNull(),
    chargedWeight: decimal('charged_weight', { precision: 10, scale: 2 }).notNull(),
    totalVolumes: int('total_volumes').notNull().default(1),
    quotedFreight: decimal('quoted_freight', { precision: 10, scale: 2 }),
    confirmedFreight: decimal('confirmed_freight', { precision: 10, scale: 2 }),
    deltaValue: decimal('delta_value', { precision: 10, scale: 2 }),
    confirmationSource: varchar('confirmation_source', { length: 30 }),
    status: varchar('status', { length: 20 }).notNull().default('SIMULATED'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    idxTenantStatus: index('idx_freight_conf_tenant_status').on(table.tenantId, table.status),
    idxSimulation: index('idx_freight_conf_simulation').on(table.simulationId),
}));

export type FreightConfirmationRecord = typeof freightConfirmations.$inferSelect;

// --- Freight Memory (Aggregated) ---

export const freightMemory = mysqlTable('freight_memory', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    cepPrefix: varchar('cep_prefix', { length: 5 }).notNull(),
    zoneCode: varchar('zone_code', { length: 30 }),
    carrierName: varchar('carrier_name', { length: 60 }).notNull(),
    productFamily: varchar('product_family', { length: 60 }),
    weightBand: varchar('weight_band', { length: 30 }),
    volumeBand: varchar('volume_band', { length: 30 }),
    avgConfirmedFreight: decimal('avg_confirmed_freight', { precision: 10, scale: 2 }),
    avgDelta: decimal('avg_delta', { precision: 10, scale: 2 }),
    confirmationsCount: int('confirmations_count').notNull().default(0),
    confidenceScore: varchar('confidence_score', { length: 10 }).notNull().default('low'),
    lastUpdated: timestamp('last_updated').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    idxTenantCarrierZone: index('idx_freight_mem_tenant_carrier_zone').on(table.tenantId, table.carrierName, table.zoneCode),
    idxTenantCep: index('idx_freight_mem_tenant_cep').on(table.tenantId, table.cepPrefix),
}));

export type FreightMemoryRecord = typeof freightMemory.$inferSelect;

// --- Freight Shipments ---

export const freightShipments = mysqlTable('freight_shipments', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    simulationId: varchar('simulation_id', { length: 36 }),
    orderId: varchar('order_id', { length: 36 }),
    carrier: varchar('carrier', { length: 60 }).notNull(),
    service: varchar('service', { length: 60 }).notNull(),
    externalShipmentId: varchar('external_shipment_id', { length: 64 }),
    trackingCode: varchar('tracking_code', { length: 60 }),
    shipmentPrice: decimal('shipment_price', { precision: 10, scale: 2 }),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    idxTenantSimulation: index('idx_freight_shipments_tenant_sim').on(table.tenantId, table.simulationId),
    idxTenantOrder: index('idx_freight_shipments_tenant_order').on(table.tenantId, table.orderId),
    uqExternalShipmentId: uniqueIndex('uq_freight_shipments_external_shipment_id').on(table.externalShipmentId),
    idxTracking: index('idx_freight_shipments_tracking').on(table.trackingCode),
    idxTenantCreated: index('idx_freight_shipments_tenant_created_at').on(table.tenantId, table.createdAt),
    idxTenantStatus: index('idx_freight_shipments_tenant_status').on(table.tenantId, table.status),
}));

export type FreightShipmentRecord = typeof freightShipments.$inferSelect;

// --- Frank Knowledge Base ---

export const frankKnowledge = mysqlTable('frank_knowledge', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    tags: json('tags').$type<string[]>(),
    source: varchar('source', { length: 50 }).notNull().default('manual'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    idxTenantCreated: index('idx_frank_knowledge_tenant_created').on(table.tenantId, table.createdAt),
}));

export type FrankKnowledgeRecord = typeof frankKnowledge.$inferSelect;
export type NewFrankKnowledgeRecord = typeof frankKnowledge.$inferInsert;

// --- Frank Conversation Memory ---

export const frankConversationMemory = mysqlTable('frank_conversation_memory', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    sessionId: varchar('session_id', { length: 128 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(),
    message: text('message').notNull(),
    intent: varchar('intent', { length: 50 }),
    entities: json('entities'),
    timestamp: timestamp('timestamp').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxTenantSession: index('idx_frank_memory_tenant_session').on(table.tenantId, table.sessionId, table.timestamp),
}));

export type FrankConversationMemoryRecord = typeof frankConversationMemory.$inferSelect;
export type NewFrankConversationMemoryRecord = typeof frankConversationMemory.$inferInsert;

// --- Frank Suggestions ---

export const frankSuggestions = mysqlTable('frank_suggestions', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    conversationId: varchar('conversation_id', { length: 36 }).notNull(),
    sessionId: varchar('session_id', { length: 128 }).notNull(),
    intent: varchar('intent', { length: 255 }),
    entities: json('entities'),
    playbookId: varchar('playbook_id', { length: 36 }),
    suggestedResponse: text('suggested_response').notNull(),
    confidence: decimal('confidence', { precision: 5, scale: 4 }),
    status: varchar('status', { length: 50 }).notNull().default('generated'), // generated, approved, edited, rejected
    approvedBy: varchar('approved_by', { length: 128 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    approvedAt: timestamp('approved_at'),
}, (table) => ({
    idxTenantSession: index('idx_frank_suggestions_tenant_session').on(table.tenantId, table.sessionId, table.createdAt),
    idxTenantConversation: index('idx_frank_suggestions_tenant_conversation').on(table.tenantId, table.conversationId),
}));

export type FrankSuggestionRecord = typeof frankSuggestions.$inferSelect;
export type NewFrankSuggestionRecord = typeof frankSuggestions.$inferInsert;

// --- Frank Intent Training ---

export const frankIntentTraining = mysqlTable('frank_intent_training', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    conversationId: varchar('conversation_id', { length: 36 }),
    messageId: varchar('message_id', { length: 36 }),
    messageText: text('message_text').notNull(),
    detectedIntent: varchar('detected_intent', { length: 255 }),
    entities: json('entities'),
    confidence: decimal('confidence', { precision: 5, scale: 4 }),
    status: varchar('status', { length: 50 }).notNull().default('captured'), // captured, validated, ignored
    playbookId: varchar('playbook_id', { length: 36 }),
    linkStatus: varchar('link_status', { length: 50 }).notNull().default('unlinked'), // unlinked, linked, converted_to_playbook
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxTenantStatus: index('idx_frank_intents_tenant_status').on(table.tenantId, table.status),
    idxCreatedAt: index('idx_frank_intents_created_at').on(table.createdAt),
}));

export type FrankIntentTrainingRecord = typeof frankIntentTraining.$inferSelect;
export type NewFrankIntentTrainingRecord = typeof frankIntentTraining.$inferInsert;

// --- Incoming Messages (Async Worker Queue) ---

export const incomingMessages = mysqlTable('incoming_messages', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    sessionId: varchar('session_id', { length: 128 }).notNull(),
    message: text('message').notNull(),
    phone: varchar('phone', { length: 30 }),
    twilioPayload: json('twilio_payload'),
    timestamp: timestamp('timestamp').default(sql`CURRENT_TIMESTAMP`).notNull(),
    processed: boolean('processed').notNull().default(false),
    processedAt: timestamp('processed_at'),
}, (table) => ({
    idxUnprocessed: index('idx_incoming_messages_unprocessed').on(table.processed, table.timestamp),
}));

export type IncomingMessageRecord = typeof incomingMessages.$inferSelect;
export type NewIncomingMessageRecord = typeof incomingMessages.$inferInsert;

// --- Frank Session State ---

export const frankSessionState = mysqlTable('frank_session_state', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    sessionId: varchar('session_id', { length: 128 }).notNull(),
    customerId: varchar('customer_id', { length: 36 }),
    organizationId: varchar('organization_id', { length: 36 }),
    currentIntent: varchar('current_intent', { length: 50 }),
    currentStep: varchar('current_step', { length: 50 }),
    lastSimulationId: varchar('last_simulation_id', { length: 36 }),
    lastOrderId: varchar('last_order_id', { length: 36 }),
    lastReferencedShipmentId: varchar('last_referenced_shipment_id', { length: 36 }),
    lastReferencedQuoteId: varchar('last_referenced_quote_id', { length: 36 }),
    lastReferencedCustomerId: varchar('last_referenced_customer_id', { length: 36 }),
    lastToolUsed: varchar('last_tool_used', { length: 60 }),
    autoResponsesCount: int('auto_responses_count').notNull().default(0),
    lastAutoResponseAt: timestamp('last_auto_response_at'),
    attributionToken: varchar('attribution_token', { length: 128 }),
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    contextJson: json('context_json').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    uqTenantSession: uniqueIndex('uq_frank_session_tenant_session').on(table.tenantId, table.sessionId),
    idxUpdatedAt: index('idx_frank_session_updated').on(table.updatedAt),
}));

export type FrankSessionStateRecord = typeof frankSessionState.$inferSelect;

// --- Frank Durable Execution Runs & Steps ---

export const frankExecutionRuns = mysqlTable('frank_execution_runs', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    executionId: varchar('execution_id', { length: 100 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    triggerSource: varchar('trigger_source', { length: 50 }).notNull().default('OBSERVER'), // OBSERVER, MANUAL, CRON, SYSTEM
    status: varchar('status', { length: 30 }).notNull().default('PENDING'), // PENDING, RUNNING, PAUSED_HUMAN_APPROVAL, COMPLETED, FAILED, CANCELLED
    currentStep: varchar('current_step', { length: 100 }),
    autonomyLevel: varchar('autonomy_level', { length: 30 }).notNull().default('OBSERVE'), // OBSERVE, SUGGEST, EXECUTE_SAFE, EXECUTE_GUARDED, HUMAN_REQUIRED
    contextJson: json('context_json'),
    resultJson: json('result_json'),
    errorMsg: text('error_msg'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    idxExecutionRunTenantStatus: index('idx_frank_exec_run_tenant_status').on(table.tenantId, table.status),
    idxExecutionRunTenantCreated: index('idx_frank_exec_run_tenant_created').on(table.tenantId, table.createdAt),
}));

export type FrankExecutionRunRecord = typeof frankExecutionRuns.$inferSelect;
export type NewFrankExecutionRunRecord = typeof frankExecutionRuns.$inferInsert;

export const frankExecutionSteps = mysqlTable('frank_execution_steps', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    executionRunId: varchar('execution_run_id', { length: 36 }).notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    stepNumber: int('step_number').notNull(),
    stepName: varchar('step_name', { length: 100 }).notNull(),
    actionType: varchar('action_type', { length: 100 }).notNull(),
    status: varchar('status', { length: 30 }).notNull().default('PENDING'), // PENDING, RUNNING, AWAITING_APPROVAL, COMPLETED, FAILED, SKIPPED
    inputPayload: json('input_payload'),
    outputPayload: json('output_payload'),
    toolCallsJson: json('tool_calls_json'),
    riskClass: varchar('risk_class', { length: 30 }).notNull().default('SAFE'), // SAFE, GUARDED, CRITICAL
    requiresHumanApproval: boolean('requires_human_approval').notNull().default(false),
    approvedBy: varchar('approved_by', { length: 100 }),
    approvedAt: timestamp('approved_at'),
    errorMsg: text('error_msg'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxExecutionStepRun: index('idx_frank_exec_step_run').on(table.executionRunId, table.stepNumber),
    idxExecutionStepTenantStatus: index('idx_frank_exec_step_tenant_status').on(table.tenantId, table.status),
}));

export type FrankExecutionStepRecord = typeof frankExecutionSteps.$inferSelect;
export type NewFrankExecutionStepRecord = typeof frankExecutionSteps.$inferInsert;


// --- Atendimento Humano (Conversations) ---

export const conversations = mysqlTable('conversations', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    customerId: varchar('customer_id', { length: 36 }),
    organizationId: varchar('organization_id', { length: 36 }),
    phoneHash: varchar('phone_hash', { length: 64 }).notNull(),
    phoneEncrypted: varchar('phone_encrypted', { length: 255 }).notNull(),
    channel: varchar('channel', { length: 20 }).notNull().default('WHATSAPP'),
    status: mysqlEnum('status', ConversationStatusEnum).notNull().default('new'),
    stage: mysqlEnum('stage', ['NEW_LEAD', 'IN_ATTENDANCE', 'QUOTED', 'WON', 'LOST']).notNull().default('NEW_LEAD'),
    version: int('version').notNull().default(0),
    assignedTo: varchar('assigned_to', { length: 36 }),
    lostReason: varchar('lost_reason', { length: 255 }),
    lastMessageAt: timestamp('last_message_at').default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    idxTenantPhone: index('idx_conversations_tenant_phone').on(table.tenantId, table.phoneHash),
    idxTenantStatus: index('idx_conversations_tenant_status').on(table.tenantId, table.status),
}));

export const conversationMessages = mysqlTable('conversation_messages', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    conversationId: varchar('conversation_id', { length: 36 }).notNull(),
    direction: mysqlEnum('direction', MessageDirectionEnum).notNull(),
    source: varchar('source', { length: 30 }).notNull(), // WHATSAPP | OPERATOR | SYSTEM
    message: text('message').notNull(),
    metadata: json('metadata'),
    providerMessageId: varchar('provider_message_id', { length: 100 }), // Twilio MessageSid
    deliveryStatus: mysqlEnum('delivery_status', MessageDeliveryStatusEnum),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxConversationCreated: index('idx_conversation_msgs_conv_created').on(table.conversationId, table.createdAt),
    uqProviderMsg: uniqueIndex('uq_conversation_msgs_provider').on(table.providerMessageId),
}));

export const conversationAssignments = mysqlTable('conversation_assignments', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    conversationId: varchar('conversation_id', { length: 36 }).notNull(),
    assignedTo: varchar('assigned_to', { length: 36 }).notNull(),
    assignedBy: varchar('assigned_by', { length: 36 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxConversationAssign: index('idx_conversation_assign_conv').on(table.conversationId),
}));

export type ConversationRecord = typeof conversations.$inferSelect;
export type NewConversationRecord = typeof conversations.$inferInsert;
export type ConversationMessageRecord = typeof conversationMessages.$inferSelect;
export type NewConversationMessageRecord = typeof conversationMessages.$inferInsert;
export type ConversationAssignmentRecord = typeof conversationAssignments.$inferSelect;
export type NewConversationAssignmentRecord = typeof conversationAssignments.$inferInsert;

// --- Rastreio Logístico (Shipments) ---

export const shipments = mysqlTable('shipments', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    orderId: varchar('order_id', { length: 36 }).notNull(),
    carrier: varchar('carrier', { length: 100 }).notNull(),
    service: varchar('service', { length: 100 }),
    trackingCode: varchar('tracking_code', { length: 100 }),
    trackingUrl: varchar('tracking_url', { length: 255 }),
    status: varchar('status', { length: 30 }).notNull().default('CREATED'), // CREATED, SCHEDULED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED
    estimatedDelivery: int('estimated_delivery'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    idxShipmentsTenantOrder: index('idx_shipments_tenant_order').on(table.tenantId, table.orderId),
    idxShipmentsTenantCreated: index('idx_shipments_tenant_created_at').on(table.tenantId, table.createdAt),
    idxShipmentsTenantStatus: index('idx_shipments_tenant_status').on(table.tenantId, table.status),
}));

export type ShipmentRecord = typeof shipments.$inferSelect;
export type NewShipmentRecord = typeof shipments.$inferInsert;

export const crmNotes = mysqlTable('crm_notes', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    customerId: varchar('customer_id', { length: 36 }).notNull(),
    conversationId: varchar('conversation_id', { length: 36 }),
    authorOperatorId: varchar('author_operator_id', { length: 36 }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    idxCrmNotesCustomer: index('idx_crm_notes_customer').on(table.tenantId, table.customerId),
    idxCrmNotesConversation: index('idx_crm_notes_tenant_conversation').on(table.tenantId, table.conversationId),
    idxCrmNotesCreated: index('idx_crm_notes_tenant_created_at').on(table.tenantId, table.createdAt),
}));

export const crmTasks = mysqlTable('crm_tasks', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    customerId: varchar('customer_id', { length: 36 }).notNull(),
    conversationId: varchar('conversation_id', { length: 36 }),
    assignedOperatorId: varchar('assigned_operator_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    dueAt: timestamp('due_at'),
    status: varchar('status', { length: 30 }).notNull().default('OPEN'), // OPEN, DONE, CANCELED
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    idxCrmTasksCustomer: index('idx_crm_tasks_customer').on(table.tenantId, table.customerId),
    idxCrmTasksStatus: index('idx_crm_tasks_tenant_status').on(table.tenantId, table.status),
    idxCrmTasksConversation: index('idx_crm_tasks_tenant_conversation').on(table.tenantId, table.conversationId),
    idxCrmTasksCreated: index('idx_crm_tasks_tenant_created_at').on(table.tenantId, table.createdAt),
}));

export type CrmNoteRecord = typeof crmNotes.$inferSelect;
export type NewCrmNoteRecord = typeof crmNotes.$inferInsert;
export type CrmTaskRecord = typeof crmTasks.$inferSelect;
export type NewCrmTaskRecord = typeof crmTasks.$inferInsert;

// --- Governance Module ---

export const governanceSpaces = mysqlTable('governance_spaces', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    color: varchar('color', { length: 50 }),
    icon: varchar('icon', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    archivedAt: timestamp('archived_at'),
}, (table) => ({
    tenantIdx: index('idx_gov_spaces_tenant').on(table.tenantId),
}));

export const governanceProjects = mysqlTable('governance_projects', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    spaceId: varchar('space_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    visibility: varchar('visibility', { length: 30 }).notNull().default('private'), // private, space, public
    status: varchar('status', { length: 30 }).notNull().default('active'),
    sortOrder: int('sort_order').notNull().default(0),
    createdBy: varchar('created_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    archivedAt: timestamp('archived_at'),
}, (table) => ({
    tenantSpaceIdx: index('idx_gov_proj_tenant_space').on(table.tenantId, table.spaceId),
}));

export const governanceLists = mysqlTable('governance_lists', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 30 }).notNull().default('todo'),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    tenantProjectIdx: index('idx_gov_lists_tenant_proj').on(table.tenantId, table.projectId),
}));

export const governanceTasks = mysqlTable('governance_tasks', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    projectId: varchar('project_id', { length: 36 }).notNull(),
    listId: varchar('list_id', { length: 36 }).notNull(),
    parentTaskId: varchar('parent_task_id', { length: 36 }),

    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 50 }).notNull().default('open'),
    priority: varchar('priority', { length: 30 }).notNull().default('normal'), // low, normal, high, urgent

    assigneeUserId: varchar('assignee_user_id', { length: 36 }),
    reporterUserId: varchar('reporter_user_id', { length: 36 }).notNull(),
    dueAt: timestamp('due_at'),
    startAt: timestamp('start_at'),
    sortOrder: int('sort_order').notNull().default(0),
    sourceType: varchar('source_type', { length: 50 }).notNull().default('manual'), // manual, system, frank
    sourceRef: varchar('source_ref', { length: 255 }),
    taskType: varchar('task_type', { length: 50 }).notNull().default('task'),
    incidentSource: varchar('incident_source', { length: 100 }),
    incidentSeverity: varchar('incident_severity', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    archivedAt: timestamp('archived_at'),
}, (table) => ({
    tenantProjectIdx: index('idx_gov_tasks_tenant_proj').on(table.tenantId, table.projectId),
    tenantAssigneeIdx: index('idx_gov_tasks_tenant_assignee').on(table.tenantId, table.assigneeUserId),
    tenantStatusIdx: index('idx_gov_tasks_tenant_status').on(table.tenantId, table.status),
    tenantDueIdx: index('idx_gov_tasks_tenant_due_at').on(table.tenantId, table.dueAt),

}));

export const governanceTaskComments = mysqlTable('governance_task_comments', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    taskId: varchar('task_id', { length: 36 }).notNull(),
    authorUserId: varchar('author_user_id', { length: 36 }).notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    tenantTaskIdx: index('idx_gov_comments_tenant_task').on(table.tenantId, table.taskId),
}));

export const governanceTaskEvents = mysqlTable('governance_task_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    taskId: varchar('task_id', { length: 36 }).notNull(),
    actorUserId: varchar('actor_user_id', { length: 36 }),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    payloadJson: json('payload_json').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantTaskIdx: index('idx_gov_events_tenant_task').on(table.tenantId, table.taskId),
}));

export const governanceTaskLinks = mysqlTable('governance_task_links', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    taskId: varchar('task_id', { length: 36 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // customer, order, etc.
    entityId: varchar('entity_id', { length: 64 }).notNull(),
    label: varchar('label', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantEntityIdx: index('idx_gov_links_tenant_entity').on(table.tenantId, table.entityType, table.entityId),
    tenantTaskIdx: index('idx_gov_links_tenant_task').on(table.tenantId, table.taskId),
}));

export const governanceTaskLabels = mysqlTable('governance_task_labels', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 50 }).notNull(),
}, (table) => ({
    tenantIdx: index('idx_gov_labels_tenant').on(table.tenantId),
}));

export const governanceTaskLabelAssignments = mysqlTable('governance_task_label_assignments', {
    taskId: varchar('task_id', { length: 36 }).notNull(),
    labelId: varchar('label_id', { length: 36 }).notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.taskId, table.labelId] }),
}));

export type GovernanceSpaceRecord = typeof governanceSpaces.$inferSelect;
export type NewGovernanceSpaceRecord = typeof governanceSpaces.$inferInsert;
export type GovernanceProjectRecord = typeof governanceProjects.$inferSelect;
export type NewGovernanceProjectRecord = typeof governanceProjects.$inferInsert;
export type GovernanceListRecord = typeof governanceLists.$inferSelect;
export type NewGovernanceListRecord = typeof governanceLists.$inferInsert;
export type GovernanceTaskRecord = typeof governanceTasks.$inferSelect;
export type NewGovernanceTaskRecord = typeof governanceTasks.$inferInsert;
export type GovernanceTaskCommentRecord = typeof governanceTaskComments.$inferSelect;
export type NewGovernanceTaskCommentRecord = typeof governanceTaskComments.$inferInsert;
export type GovernanceTaskEventRecord = typeof governanceTaskEvents.$inferSelect;
export type NewGovernanceTaskEventRecord = typeof governanceTaskEvents.$inferInsert;
export type GovernanceTaskLinkRecord = typeof governanceTaskLinks.$inferSelect;
export type NewGovernanceTaskLinkRecord = typeof governanceTaskLinks.$inferInsert;
export type GovernanceTaskLabelRecord = typeof governanceTaskLabels.$inferSelect;
export type NewGovernanceTaskLabelRecord = typeof governanceTaskLabels.$inferInsert;
export type GovernanceTaskLabelAssignmentRecord = typeof governanceTaskLabelAssignments.$inferSelect;
export type NewGovernanceTaskLabelAssignmentRecord = typeof governanceTaskLabelAssignments.$inferInsert;

// --- Governance: Knowledge & Playbook Engine ---

export const playbooks = mysqlTable('playbooks', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    triggerType: varchar('trigger_type', { length: 50 }),
    sourceTaskType: varchar('source_task_type', { length: 50 }),
    createdBy: varchar('created_by', { length: 36 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    archivedAt: timestamp('archived_at'),
}, (table) => ({
    idxPlaybooksTenant: index('idx_playbooks_tenant').on(table.tenantId),
}));

export const playbookSteps = mysqlTable('playbook_steps', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    playbookId: varchar('playbook_id', { length: 36 }).notNull(),
    stepOrder: int('step_order').notNull().default(0),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    actionType: varchar('action_type', { length: 50 }).notNull().default('manual_task'),
    actionConfig: json('action_config'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    idxPlaybookStepsPlaybook: index('idx_playbook_steps_playbook').on(table.playbookId),
}));

export type PlaybookRecord = typeof playbooks.$inferSelect;
export type NewPlaybookRecord = typeof playbooks.$inferInsert;
export type PlaybookStepRecord = typeof playbookSteps.$inferSelect;
export type NewPlaybookStepRecord = typeof playbookSteps.$inferInsert;

// --- CRM Operational (Phase 8 & 10) ---

export const crmOpportunities = mysqlTable('crm_opportunities', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    customerId: varchar('customer_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }),
    stage: varchar('stage', { length: 50 }).notNull().default('new_lead'), // new_lead, qualified, quoted, proposal_sent, awaiting_response, won, lost
    status: varchar('status', { length: 30 }).notNull().default('active'), // active, won, lost
    lossReason: varchar('loss_reason', { length: 255 }),
    nextAction: varchar('next_action', { length: 255 }),
    nextActionAt: timestamp('next_action_at'),
    lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
    contextRef: json('context_ref'), // To store details like litragem, CEP, objections
    responsibleUserId: varchar('responsible_user_id', { length: 36 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    idxCrmOppTenantCustomer: index('idx_crm_opp_tenant_customer').on(table.tenantId, table.customerId),
    idxCrmOppStage: index('idx_crm_opp_stage').on(table.tenantId, table.stage),
    idxCrmOppStatus: index('idx_crm_opp_tenant_status').on(table.tenantId, table.status),
    idxCrmOppCreated: index('idx_crm_opp_tenant_created_at').on(table.tenantId, table.createdAt),
}));

export const crmQuotes = mysqlTable('crm_quotes', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    opportunityId: varchar('opportunity_id', { length: 36 }).notNull(),
    validUntil: timestamp('valid_until'),
    status: varchar('status', { length: 30 }).notNull().default('draft'), // draft, sent, accepted, rejected, expired
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    freightAmount: decimal('freight_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    idxCrmQuotesOpp: index('idx_crm_quotes_opp').on(table.tenantId, table.opportunityId),
    idxCrmQuotesStatus: index('idx_crm_quotes_tenant_status').on(table.tenantId, table.status),
    idxCrmQuotesCreated: index('idx_crm_quotes_tenant_created_at').on(table.tenantId, table.createdAt),
}));

export const crmQuoteItems = mysqlTable('crm_quote_items', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    quoteId: varchar('quote_id', { length: 36 }).notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    quantity: int('quantity').notNull().default(1),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    idxCrmQuoteItemsQuote: index('idx_crm_quote_items_quote').on(table.quoteId),
}));

export const crmFollowUps = mysqlTable('crm_follow_ups', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    opportunityId: varchar('opportunity_id', { length: 36 }).notNull(),
    scheduledAt: timestamp('scheduled_at').notNull(),
    completedAt: timestamp('completed_at'),
    description: text('description'),
    status: varchar('status', { length: 30 }).notNull().default('pending'), // pending, completed, canceled
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    idxCrmFollowUpsOpp: index('idx_crm_follow_ups_opp').on(table.tenantId, table.opportunityId),
    idxCrmFollowUpsPending: index('idx_crm_follow_ups_pending').on(table.tenantId, table.status, table.scheduledAt),
}));

export type CrmOpportunityRecord = typeof crmOpportunities.$inferSelect;
export type NewCrmOpportunityRecord = typeof crmOpportunities.$inferInsert;
export type CrmQuoteRecord = typeof crmQuotes.$inferSelect;
export type NewCrmQuoteRecord = typeof crmQuotes.$inferInsert;
export type CrmQuoteItemRecord = typeof crmQuoteItems.$inferSelect;
export type NewCrmQuoteItemRecord = typeof crmQuoteItems.$inferInsert;
export type CrmFollowUpRecord = typeof crmFollowUps.$inferSelect;
export type NewCrmFollowUpRecord = typeof crmFollowUps.$inferInsert;

export const operationalAuditLogs = mysqlTable('operational_audit_logs', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'opportunity', 'order', 'client', etc.
    entityId: varchar('entity_id', { length: 36 }).notNull(),
    actorId: varchar('actor_id', { length: 255 }), // user id or 'frank'
    actionType: varchar('action_type', { length: 100 }).notNull(), // 'status_changed', 'owner_assigned', 'note_added', etc.
    beforeState: json('before_state'),
    afterState: json('after_state'),
    origin: varchar('origin', { length: 50 }).notNull().default('ui'), // 'ui', 'bulk', 'drawer', 'palette', 'frank'
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    idxAuditTenantEntity: index('idx_audit_tenant_entity').on(table.tenantId, table.entityType, table.entityId),
    idxAuditTenantActor: index('idx_audit_tenant_actor').on(table.tenantId, table.actorId),
}));

export type OperationalAuditLogRecord = typeof operationalAuditLogs.$inferSelect;
export type NewOperationalAuditLogRecord = typeof operationalAuditLogs.$inferInsert;

export const frankActions = mysqlTable('frank_actions', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    type: varchar('type', { length: 100 }).notNull(), // DOMÍNIO DA AÇÃO, e.g., 'moveOpportunityStage', 'assignOrderOwner'
    status: varchar('status', { length: 30 }).notNull().default('draft'), // draft, review_required, approved, executing, executed, failed, cancelled
    payload: json('payload').notNull(), // O payload que a action irá utilizar
    explanation: json('explanation').notNull(), // { what: string, why: string, impact: string, risk: string, rollback: boolean }
    createdBy: varchar('created_by', { length: 255 }).notNull().default('frank'), // O ID/Nome do construtor da action (normalmente Frank)
    reviewedBy: varchar('reviewed_by', { length: 36 }), // O usuário que aprovou/rejeitou
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'opportunity', 'order', 'client', etc.
    entityId: varchar('entity_id', { length: 36 }).notNull(), // O ID do recurso sendo modificado
    errorMsg: text('error_msg'), // Em caso de falha na action
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    idxFrankActionTenantEntity: index('idx_frank_action_tenant_entity').on(table.tenantId, table.entityType, table.entityId),
    idxFrankActionStatus: index('idx_frank_action_status').on(table.tenantId, table.status),
}));

export type FrankActionRecord = typeof frankActions.$inferSelect;
export type NewFrankActionRecord = typeof frankActions.$inferInsert;

// --- Ecosystem Event Bus ---

export const ecosystemEvents = mysqlTable('ecosystem_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    type: varchar('type', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: varchar('entity_id', { length: 255 }),
    payloadJson: json('payload_json'),
    actor: varchar('actor', { length: 255 }).notNull(),
    source: varchar('source', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxEcoEventsTenantType: index('idx_eco_events_tenant_type').on(table.tenantId, table.type, table.createdAt),
    idxEcoEventsTenantEntity: index('idx_eco_events_tenant_entity').on(table.tenantId, table.entityType, table.entityId),
    idxEcoEventsCreatedAt: index('idx_eco_events_created_at').on(table.createdAt),
}));

export type EcosystemEventRecord = typeof ecosystemEvents.$inferSelect;
export type NewEcosystemEventRecord = typeof ecosystemEvents.$inferInsert;

// --- Workflow Engine ---

export const workflowRules = mysqlTable('workflow_rules', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    triggerType: varchar('trigger_type', { length: 30 }).notNull(), // event, schedule, condition
    triggerConfig: json('trigger_config').notNull(), // { eventType, schedule, conditionField, conditionOp, conditionValue }
    conditionJson: json('condition_json'), // additional conditions
    actionType: varchar('action_type', { length: 80 }).notNull(), // create_followup, send_notification, update_stage, etc.
    actionConfig: json('action_config').notNull(), // action-specific params
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    idxWfRulesTenantActive: index('idx_wf_rules_tenant_active').on(table.tenantId, table.isActive),
    idxWfRulesTrigger: index('idx_wf_rules_trigger').on(table.triggerType),
}));

export type WorkflowRuleRecord = typeof workflowRules.$inferSelect;
export type NewWorkflowRuleRecord = typeof workflowRules.$inferInsert;

export const workflowRuns = mysqlTable('workflow_runs', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    ruleId: varchar('rule_id', { length: 36 }).notNull(),
    triggerEventId: varchar('trigger_event_id', { length: 36 }),
    status: varchar('status', { length: 30 }).notNull().default('running'), // running, completed, failed
    resultJson: json('result_json'),
    errorMsg: text('error_msg'),
    startedAt: timestamp('started_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    completedAt: timestamp('completed_at'),
}, (table) => ({
    idxWfRunsTenantRule: index('idx_wf_runs_tenant_rule').on(table.tenantId, table.ruleId),
    idxWfRunsStatus: index('idx_wf_runs_status').on(table.status),
}));

export type WorkflowRunRecord = typeof workflowRuns.$inferSelect;
export type NewWorkflowRunRecord = typeof workflowRuns.$inferInsert;

// --- Global Search Index ---

export const searchIndex = mysqlTable('search_index', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // customer, order, conversation, quote, shipment, note
    entityId: varchar('entity_id', { length: 128 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    body: text('body'),
    phone: varchar('phone', { length: 64 }),
    email: varchar('email', { length: 128 }),
    metadataJson: json('metadata_json'),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
}, (table) => ({
    idxSearchTenantEntity: uniqueIndex('uq_search_index_tenant_entity').on(table.tenantId, table.entityType, table.entityId),
    idxSearchTenantTitle: index('idx_search_index_tenant_title').on(table.tenantId, table.title),
}));

export type SearchIndexRecord = typeof searchIndex.$inferSelect;
export type NewSearchIndexRecord = typeof searchIndex.$inferInsert;

// --- Notifications ---

export const notifications = mysqlTable('notifications', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // lead_hot, lead_followup_due, order_stuck, shipment_delayed, new_message
    entityType: varchar('entity_type', { length: 50 }),
    entityId: varchar('entity_id', { length: 128 }),
    priority: varchar('priority', { length: 20 }).notNull().default('normal'), // low, normal, high, urgent
    payload: json('payload'),
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxNotifUserRead: index('idx_notif_user_read').on(table.tenantId, table.userId, table.read, table.createdAt),
    idxNotifCreated: index('idx_notif_created').on(table.createdAt),
}));

export type NotificationRecord = typeof notifications.$inferSelect;
export type NewNotificationRecord = typeof notifications.$inferInsert;

// --- Queue Jobs ---

export const queueJobs = mysqlTable('queue_jobs', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }),
    type: varchar('type', { length: 80 }).notNull(), // recalculate_pipeline, generate_frank_insights, sync_search_index, evaluate_workflows
    payload: json('payload').notNull(),
    status: varchar('status', { length: 30 }).notNull().default('pending'), // pending, running, completed, failed, dead
    attempts: int('attempts').notNull().default(0),
    maxAttempts: int('max_attempts').notNull().default(3),
    errorMsg: text('error_msg'),
    scheduledAt: timestamp('scheduled_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxQueueStatus: index('idx_queue_jobs_status').on(table.status, table.scheduledAt),
    idxQueueType: index('idx_queue_jobs_type').on(table.type, table.status),
}));

export type QueueJobRecord = typeof queueJobs.$inferSelect;
export type NewQueueJobRecord = typeof queueJobs.$inferInsert;

// --- Operational Metrics (Telemetry) ---

export const operationalMetrics = mysqlTable('operational_metrics', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    metric: varchar('metric', { length: 80 }).notNull(), // time_to_first_reply, time_to_close_lead, order_processing_time, shipment_delay_rate
    value: decimal('value', { precision: 12, scale: 4 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: varchar('entity_id', { length: 128 }),
    metadataJson: json('metadata_json'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
    idxOpMetricsTenantMetric: index('idx_op_metrics_tenant_metric').on(table.tenantId, table.metric, table.createdAt),
    idxOpMetricsCreated: index('idx_op_metrics_created').on(table.createdAt),
}));

export type OperationalMetricRecord = typeof operationalMetrics.$inferSelect;
export type NewOperationalMetricRecord = typeof operationalMetrics.$inferInsert;
