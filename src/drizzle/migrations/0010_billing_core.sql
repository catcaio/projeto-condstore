CREATE TABLE `plans` (
	`id` varchar(36) NOT NULL,
	`name` varchar(64) NOT NULL,
	`monthly_price_usd` decimal(12,6) NOT NULL,
	`monthly_budget_usd` decimal(12,6) NOT NULL,
	`soft_limit_percent` int NOT NULL DEFAULT 80,
	`hard_limit_percent` int NOT NULL DEFAULT 100,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);

CREATE TABLE `tenant_subscriptions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`plan_id` varchar(36) NOT NULL,
	`status` varchar(32) NOT NULL,
	`started_at` timestamp NOT NULL,
	`ended_at` timestamp,
	CONSTRAINT `tenant_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_tenant_subscriptions_tenant` UNIQUE(`tenant_id`)
);

CREATE TABLE `billing_ledger` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(32) NOT NULL,
	`amount_usd` decimal(12,6),
	`metadata` json,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `billing_ledger_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_billing_ledger_tenant` ON `billing_ledger` (`tenant_id`);
CREATE INDEX `idx_billing_ledger_tenant_created` ON `billing_ledger` (`tenant_id`, `created_at`);
