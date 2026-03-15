CREATE TABLE `crm_notes` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`conversation_id` varchar(36),
	`author_operator_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`conversation_id` varchar(36),
	`assigned_operator_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`due_at` timestamp,
	`status` varchar(30) NOT NULL DEFAULT 'OPEN',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `stage` varchar(50) NOT NULL DEFAULT 'NEW';--> statement-breakpoint
UPDATE `conversations` SET `stage` = 'NEW_LEAD' WHERE `stage` = 'NEW';--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `stage` enum('NEW_LEAD','IN_ATTENDANCE','QUOTED','WON','LOST') NOT NULL DEFAULT 'NEW_LEAD';--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `status` varchar(50) NOT NULL DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE `conversations` ADD `lost_reason` varchar(255);--> statement-breakpoint
ALTER TABLE `simulations` ADD `status` varchar(30) DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE `simulations` ADD `items` json;--> statement-breakpoint
ALTER TABLE `simulations` ADD `subtotal` decimal(12,2);--> statement-breakpoint
ALTER TABLE `simulations` ADD `discount_amount` decimal(12,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `simulations` ADD `freight_amount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `simulations` ADD `total_amount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `simulations` ADD `expires_at` timestamp;--> statement-breakpoint
ALTER TABLE `simulations` ADD `sent_at` timestamp;--> statement-breakpoint
ALTER TABLE `simulations` ADD `converted_at` timestamp;--> statement-breakpoint
ALTER TABLE `simulations` ADD `revision_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `simulations` ADD `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE INDEX `idx_crm_notes_customer` ON `crm_notes` (`tenant_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_tasks_customer` ON `crm_tasks` (`tenant_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_simulations_tenant_conversation` ON `simulations` (`tenant_id`,`conversation_id`);