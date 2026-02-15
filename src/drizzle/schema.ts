import { mysqlTable, varchar, decimal, int, timestamp, text } from 'drizzle-orm/mysql-core';
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
