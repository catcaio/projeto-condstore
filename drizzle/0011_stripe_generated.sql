CREATE TABLE IF NOT EXISTS `webhook_events` (
    `id` varchar(36) NOT NULL,
    `provider` varchar(64) NOT NULL,
    `external_id` text NOT NULL,
    `received_at` timestamp NOT NULL,
    `processed_at` timestamp,
    `status` varchar(32) NOT NULL,
    PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_webhook_events_provider_external` ON `webhook_events` (`provider`, `external_id`(100));
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `plans` (
    `id` varchar(36) NOT NULL,
    `name` varchar(64) NOT NULL,
    `monthly_price_usd` decimal(12, 6) NOT NULL,
    `monthly_budget_usd` decimal(12, 6) NOT NULL,
    `soft_limit_percent` int NOT NULL DEFAULT 80,
    `hard_limit_percent` int NOT NULL DEFAULT 100,
    `active` int NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `tenant_subscriptions` (
    `id` varchar(36) NOT NULL,
    `tenant_id` varchar(36) NOT NULL,
    `plan_id` varchar(36) NOT NULL,
    `status` varchar(32) NOT NULL,
    `started_at` timestamp NOT NULL,
    `ended_at` timestamp,
    `stripe_customer_id` varchar(128),
    `stripe_subscription_id` varchar(128),
    `last_payment_failed_at` timestamp,
    `cancel_at_period_end` boolean NOT NULL DEFAULT false,
    `current_period_end` timestamp,
    PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tenant_subscriptions_tenant` ON `tenant_subscriptions` (`tenant_id`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `billing_ledger` (
    `id` varchar(36) NOT NULL,
    `tenant_id` varchar(36) NOT NULL,
    `type` varchar(32) NOT NULL,
    `amount_usd` decimal(12, 6),
    `metadata` json,
    `created_at` timestamp NOT NULL,
    PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_billing_ledger_tenant` ON `billing_ledger` (`tenant_id`);
--> statement-breakpoint
CREATE INDEX `idx_billing_ledger_tenant_created` ON `billing_ledger` (`tenant_id`, `created_at`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `stripe_events` (
    `id` varchar(128) NOT NULL,
    `stripe_event_id` varchar(128) NOT NULL,
    `received_at` timestamp NOT NULL,
    `type` varchar(128) NOT NULL,
    `stripe_created_at` timestamp,
    `payload_hash` varchar(64),
    PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_stripe_events_event_id` ON `stripe_events` (`stripe_event_id`);
