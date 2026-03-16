CREATE TABLE `frank_actions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(100) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'draft',
	`payload` json NOT NULL,
	`explanation` json NOT NULL,
	`created_by` varchar(255) NOT NULL DEFAULT 'frank',
	`reviewed_by` varchar(36),
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(36) NOT NULL,
	`error_msg` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `frank_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_frank_action_tenant_entity` ON `frank_actions` (`tenant_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_frank_action_status` ON `frank_actions` (`tenant_id`,`status`);