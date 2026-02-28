CREATE TABLE `tenant_incidents` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`started_at` timestamp NOT NULL,
	`ended_at` timestamp,
	`triggered_by` varchar(255) NOT NULL,
	`metadata` json,
	CONSTRAINT `tenant_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tenants` ADD `incident_mode` boolean DEFAULT false NOT NULL;