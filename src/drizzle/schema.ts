import { mysqlTable, varchar, decimal, int, timestamp, text, index, uniqueIndex, json } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// --- Tenants (Multi-Tenant Support) ---

export const tenants = mysqlTable('tenants', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    twilioNumber: varchar('twilio_number', { length: 30 }).notNull().unique(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type TenantRecord = typeof tenants.$inferSelect;
export type NewTenantRecord = typeof tenants.$inferInsert;


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
    rawPayload: text('raw_payload').notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type MessageRecord = typeof messages.$inferSelect;
export type NewMessageRecord = typeof messages.$inferInsert;

// --- Users (Authentication) ---


export const users = mysqlTable('users', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 512 }).notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('operator'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;

// --- Freight Simulation Metrics ---

export const freightSimulationLogs = mysqlTable('freight_simulation_logs', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    uf: varchar('uf', { length: 2 }).notNull(),
    weight: decimal('peso', { precision: 10, scale: 2 }).notNull(),
    price: decimal('valor', { precision: 10, scale: 2 }).notNull(),
    deliveryTime: int('prazo').notNull(),
    cepHash: varchar('cep_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type FreightSimulationLogRecord = typeof freightSimulationLogs.$inferSelect;
export type NewFreightSimulationLogRecord = typeof freightSimulationLogs.$inferInsert;



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

// --- LLM Intent Engine ---

export const inboundMessages = mysqlTable('inbound_messages', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    messageSid: varchar('message_sid', { length: 64 }),
    fromNumber: varchar('from_number', { length: 30 }).notNull(),
    bodyRaw: text('body_raw').notNull(),
    bodyNorm: text('body_norm').notNull(),
    hash: varchar('hash', { length: 64 }).notNull(),
    receivedAt: timestamp('received_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        // Idempotency: primary via MessageSid
        uniqueSid: uniqueIndex('idx_unique_sid_tenant').on(table.tenantId, table.messageSid),
        // Idempotency: fallback via Hash
        uniqueHash: uniqueIndex('idx_unique_hash_tenant').on(table.tenantId, table.hash),
        // Metrics index
        idxTenantTime: index('idx_inbound_tenant_time').on(table.tenantId, table.receivedAt),
    };
});

export type InboundMessageRecord = typeof inboundMessages.$inferSelect;
export type NewInboundMessageRecord = typeof inboundMessages.$inferInsert;

export const intentLabels = mysqlTable('intent_labels', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    messageId: varchar('message_id', { length: 36 }).notNull(), // FK to inbound_messages.id (logical)
    intent: varchar('intent', { length: 100 }).notNull(),
    author: varchar('author', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        idxMessage: index('idx_label_message').on(table.messageId),
    };
});

export type IntentLabelRecord = typeof intentLabels.$inferSelect;
export type NewIntentLabelRecord = typeof intentLabels.$inferInsert;

export const llmEvents = mysqlTable('llm_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    messageId: varchar('message_id', { length: 36 }).notNull(), // FK to inbound_messages.id
    modelVersion: varchar('model_version', { length: 50 }).notNull(),
    method: varchar('method', { length: 50 }).notNull(), // 'baseline' | 'llm' | 'rate_limited'
    confidence: decimal('confidence', { precision: 5, scale: 4 }).notNull(),
    intentPredicted: varchar('intent_predicted', { length: 100 }).notNull(),
    fallbackReason: varchar('fallback_reason', { length: 100 }), // 'CONFIDENCE_LOW' | 'RATE_LIMIT' | null
    latencyMs: int('latency_ms').notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        idxMessageTime: index('idx_llm_event_message_time').on(table.messageId, table.createdAt),
        idxTime: index('idx_llm_event_time').on(table.createdAt),
    };
});

export const actionEvents = mysqlTable('action_events', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    messageId: varchar('message_id', { length: 36 }).notNull().unique(), // FK to inbound_messages.id + Idempotency Key
    intent: varchar('intent', { length: 50 }).notNull(),
    actionType: varchar('action_type', { length: 50 }).notNull(),
    inputPayload: json('input_payload'),
    outputPayload: json('output_payload'),
    status: varchar('status', { length: 20 }).notNull(), // 'success' | 'error'
    executedAt: timestamp('executed_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
    return {
        idxMessage: index('idx_action_message').on(table.messageId),
    };
});

export const conversationState = mysqlTable('conversation_state', {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 30 }).notNull(),
    currentStep: varchar('current_step', { length: 50 }).notNull().default('NONE'),
    contextJson: json('context_json'),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
}, (table) => {
    return {
        uniqueState: uniqueIndex('idx_unique_state_tenant_phone').on(table.tenantId, table.phoneNumber),
    };
});

export type ConversationStateRecord = typeof conversationState.$inferSelect;
export type NewConversationStateRecord = typeof conversationState.$inferInsert;

