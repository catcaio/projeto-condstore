CREATE TABLE IF NOT EXISTS `freight_funnel_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`phone_number` varchar(30) NOT NULL,
	`session_id` varchar(36) NOT NULL,
	`stage` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `freight_funnel_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_funnel_unique_stage` UNIQUE(`session_id`,`stage`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `project_reports` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`module_key` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'done',
	`changes` text,
	`metrics` text,
	`risks` text,
	`next_actions` text,
	`tags` text,
	`source` varchar(20) NOT NULL DEFAULT 'manual',
	`content_hash` varchar(64) NOT NULL,
	CONSTRAINT `project_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_report_hash` UNIQUE(`content_hash`)
);
--> statement-breakpoint
DROP TABLE IF EXISTS `conversation_funnel_events`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_funnel_tenant_time` ON `freight_funnel_events` (`tenant_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_report_module` ON `project_reports` (`module_key`);