import { mysqlTable, varchar, bigint, boolean, index } from 'drizzle-orm/mysql-core';

export const subscriptions = mysqlTable('subscriptions', {
    userId: varchar('user_id', { length: 36 }).primaryKey(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).notNull(),
    stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),
    planId: varchar('plan_id', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    currentPeriodEnd: bigint('current_period_end', { mode: 'number' }).notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
}, (table) => {
    return {
        customerIdIdx: index('customer_id_idx').on(table.stripeCustomerId),
        subscriptionIdIdx: index('subscription_id_idx').on(table.stripeSubscriptionId),
        statusIdx: index('status_idx').on(table.status),
        updatedAtIdx: index('updated_at_idx').on(table.updatedAt),
    };
});
