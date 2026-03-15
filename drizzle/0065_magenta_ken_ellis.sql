CREATE TABLE `playbook_steps` (
	`id` varchar(36) NOT NULL,
	`playbook_id` varchar(36) NOT NULL,
	`step_order` int NOT NULL DEFAULT 0,
	`title` varchar(255) NOT NULL,
	`description` text,
	`action_type` varchar(50) NOT NULL DEFAULT 'manual_task',
	`action_config` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playbook_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playbooks` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`trigger_type` varchar(50),
	`source_task_type` varchar(50),
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `playbooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_playbook_steps_playbook` ON `playbook_steps` (`playbook_id`);--> statement-breakpoint
CREATE INDEX `idx_playbooks_tenant` ON `playbooks` (`tenant_id`);