CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`entity_type` varchar(50),
	`entity_id` varchar(128),
	`priority` varchar(20) NOT NULL DEFAULT 'normal',
	`payload` json,
	`read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operational_metrics` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`metric` varchar(80) NOT NULL,
	`value` decimal(12,4) NOT NULL,
	`entity_type` varchar(50),
	`entity_id` varchar(128),
	`metadata_json` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `operational_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `queue_jobs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`type` varchar(80) NOT NULL,
	`payload` json NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`max_attempts` int NOT NULL DEFAULT 3,
	`error_msg` text,
	`scheduled_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `queue_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `search_index` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(128) NOT NULL,
	`title` varchar(500) NOT NULL,
	`body` text,
	`phone` varchar(64),
	`email` varchar(128),
	`metadata_json` json,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `search_index_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_search_index_tenant_entity` UNIQUE(`tenant_id`,`entity_type`,`entity_id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_rules` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`trigger_type` varchar(30) NOT NULL,
	`trigger_config` json NOT NULL,
	`condition_json` json,
	`action_type` varchar(80) NOT NULL,
	`action_config` json NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_runs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`rule_id` varchar(36) NOT NULL,
	`trigger_event_id` varchar(36),
	`status` varchar(30) NOT NULL DEFAULT 'running',
	`result_json` json,
	`error_msg` text,
	`started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	CONSTRAINT `workflow_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ecosystem_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(80) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(128),
	`payload_json` json NOT NULL,
	`actor` varchar(128) NOT NULL,
	`source` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ecosystem_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_notif_user_read` ON `notifications` (`tenant_id`,`user_id`,`read`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notif_created` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_op_metrics_tenant_metric` ON `operational_metrics` (`tenant_id`,`metric`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_op_metrics_created` ON `operational_metrics` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_queue_jobs_status` ON `queue_jobs` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `idx_queue_jobs_type` ON `queue_jobs` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_search_index_tenant_title` ON `search_index` (`tenant_id`,`title`);--> statement-breakpoint
CREATE INDEX `idx_wf_rules_tenant_active` ON `workflow_rules` (`tenant_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_wf_rules_trigger` ON `workflow_rules` (`trigger_type`);--> statement-breakpoint
CREATE INDEX `idx_wf_runs_tenant_rule` ON `workflow_runs` (`tenant_id`,`rule_id`);--> statement-breakpoint
CREATE INDEX `idx_wf_runs_status` ON `workflow_runs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_eco_events_tenant_type` ON `ecosystem_events` (`tenant_id`,`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_eco_events_tenant_entity` ON `ecosystem_events` (`tenant_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_eco_events_created_at` ON `ecosystem_events` (`created_at`);