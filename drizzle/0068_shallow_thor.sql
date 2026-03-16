CREATE TABLE `operational_audit_logs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(36) NOT NULL,
	`actor_id` varchar(255),
	`action_type` varchar(100) NOT NULL,
	`before_state` json,
	`after_state` json,
	`origin` varchar(50) NOT NULL DEFAULT 'ui',
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operational_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_audit_tenant_entity` ON `operational_audit_logs` (`tenant_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_tenant_actor` ON `operational_audit_logs` (`tenant_id`,`actor_id`);