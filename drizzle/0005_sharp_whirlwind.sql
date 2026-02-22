CREATE TABLE `tenant_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`payload` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_tenant_events_tenant_created_at` ON `tenant_events` (`tenant_id`,`created_at`);