CREATE TABLE `governance_lists` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(30) NOT NULL DEFAULT 'todo',
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governance_lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governance_projects` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`space_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`visibility` varchar(30) NOT NULL DEFAULT 'private',
	`status` varchar(30) NOT NULL DEFAULT 'active',
	`sort_order` int NOT NULL DEFAULT 0,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `governance_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governance_spaces` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`color` varchar(50),
	`icon` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `governance_spaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governance_task_comments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`author_user_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `governance_task_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governance_task_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`actor_user_id` varchar(36),
	`event_type` varchar(50) NOT NULL,
	`payload_json` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `governance_task_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governance_task_label_assignments` (
	`task_id` varchar(36) NOT NULL,
	`label_id` varchar(36) NOT NULL,
	CONSTRAINT `governance_task_label_assignments_task_id_label_id_pk` PRIMARY KEY(`task_id`,`label_id`)
);
--> statement-breakpoint
CREATE TABLE `governance_task_labels` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(50) NOT NULL,
	CONSTRAINT `governance_task_labels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governance_task_links` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(64) NOT NULL,
	`label` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `governance_task_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governance_tasks` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`list_id` varchar(36) NOT NULL,
	`parent_task_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` varchar(50) NOT NULL DEFAULT 'open',
	`priority` varchar(30) NOT NULL DEFAULT 'normal',
	`assignee_user_id` varchar(36),
	`reporter_user_id` varchar(36) NOT NULL,
	`due_at` timestamp,
	`start_at` timestamp,
	`sort_order` int NOT NULL DEFAULT 0,
	`source_type` varchar(50) NOT NULL DEFAULT 'manual',
	`source_ref` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `governance_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_gov_lists_tenant_proj` ON `governance_lists` (`tenant_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `idx_gov_proj_tenant_space` ON `governance_projects` (`tenant_id`,`space_id`);--> statement-breakpoint
CREATE INDEX `idx_gov_spaces_tenant` ON `governance_spaces` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_gov_comments_tenant_task` ON `governance_task_comments` (`tenant_id`,`task_id`);--> statement-breakpoint
CREATE INDEX `idx_gov_events_tenant_task` ON `governance_task_events` (`tenant_id`,`task_id`);--> statement-breakpoint
CREATE INDEX `idx_gov_labels_tenant` ON `governance_task_labels` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_gov_links_tenant_entity` ON `governance_task_links` (`tenant_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_gov_links_tenant_task` ON `governance_task_links` (`tenant_id`,`task_id`);--> statement-breakpoint
CREATE INDEX `idx_gov_tasks_tenant_proj` ON `governance_tasks` (`tenant_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `idx_gov_tasks_tenant_assignee` ON `governance_tasks` (`tenant_id`,`assignee_user_id`);--> statement-breakpoint
CREATE INDEX `idx_gov_tasks_tenant_status` ON `governance_tasks` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_gov_tasks_tenant_due_at` ON `governance_tasks` (`tenant_id`,`due_at`);