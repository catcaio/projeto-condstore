CREATE TABLE `ecosystem_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(100) NOT NULL,
	`entity_type` varchar(100) NOT NULL,
	`entity_id` varchar(255),
	`payload_json` json,
	`actor` varchar(255) NOT NULL,
	`source` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ecosystem_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_eco_event_tenant_type` ON `ecosystem_events` (`tenant_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_eco_event_entity` ON `ecosystem_events` (`tenant_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_event_created` ON `ecosystem_events` (`tenant_id`,`created_at`);