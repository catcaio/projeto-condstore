CREATE TABLE `domine_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`source` varchar(50) NOT NULL,
	`type` varchar(128) NOT NULL,
	`idempotency_key` varchar(255) NOT NULL,
	`payload_json` json,
	`processed_at` timestamp,
	`status` varchar(30) NOT NULL DEFAULT 'queued',
	`error_code` varchar(100),
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domine_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_domine_events_tenant_idempotency` UNIQUE(`tenant_id`,`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `domine_freight_quotes` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`quote_id` varchar(100) NOT NULL,
	`order_id` varchar(100),
	`summary` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domine_freight_quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_domine_freight_quotes_tenant_quote` UNIQUE(`tenant_id`,`quote_id`)
);
--> statement-breakpoint
CREATE TABLE `domine_orders` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`order_id` varchar(100) NOT NULL,
	`status` varchar(50) NOT NULL,
	`totals` json,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `domine_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_domine_orders_tenant_order` UNIQUE(`tenant_id`,`order_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_domine_events_tenant_status` ON `domine_events` (`tenant_id`,`status`);