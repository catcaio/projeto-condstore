CREATE TABLE `crm_follow_ups` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`opportunity_id` varchar(36) NOT NULL,
	`scheduled_at` timestamp NOT NULL,
	`completed_at` timestamp,
	`description` text,
	`status` varchar(30) NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_follow_ups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_opportunities` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`amount` decimal(12,2),
	`stage` varchar(50) NOT NULL DEFAULT 'new_lead',
	`status` varchar(30) NOT NULL DEFAULT 'active',
	`loss_reason` varchar(255),
	`next_action` varchar(255),
	`next_action_at` timestamp,
	`last_activity_at` timestamp NOT NULL DEFAULT (now()),
	`context_ref` json,
	`responsible_user_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_quote_items` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`quote_id` varchar(36) NOT NULL,
	`description` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(12,2) NOT NULL,
	`total_price` decimal(12,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_quote_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_quotes` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`opportunity_id` varchar(36) NOT NULL,
	`valid_until` timestamp,
	`status` varchar(30) NOT NULL DEFAULT 'draft',
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`discount_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`freight_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`total_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_quotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_crm_follow_ups_opp` ON `crm_follow_ups` (`tenant_id`,`opportunity_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_follow_ups_pending` ON `crm_follow_ups` (`tenant_id`,`status`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `idx_crm_opp_tenant_customer` ON `crm_opportunities` (`tenant_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_opp_stage` ON `crm_opportunities` (`tenant_id`,`stage`);--> statement-breakpoint
CREATE INDEX `idx_crm_quote_items_quote` ON `crm_quote_items` (`quote_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_quotes_opp` ON `crm_quotes` (`tenant_id`,`opportunity_id`);