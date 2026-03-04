CREATE TABLE `domine_events_dlq` (
	`id` varchar(36) NOT NULL,
	`event_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`event_type` varchar(128) NOT NULL,
	`payload_json` json,
	`failure_reason` text NOT NULL,
	`retry_count` int NOT NULL DEFAULT 0,
	`failed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domine_events_dlq_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `domine_events` ADD `retry_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `domine_events` ADD `next_retry_at` timestamp;--> statement-breakpoint
CREATE INDEX `idx_domine_events_dlq_tenant` ON `domine_events_dlq` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_domine_events_dlq_failed_at` ON `domine_events_dlq` (`failed_at`);--> statement-breakpoint
CREATE INDEX `idx_domine_events_next_retry` ON `domine_events` (`status`,`next_retry_at`);