-- Additive baseline for the existing governance entities reused by the cockpit.
-- These tables exist in the committed schema/snapshots, but their CREATE statements
-- are absent from historical SQL. Existing tables and data are preserved.
-- This does not repair unrelated gaps in the complete historical migration chain.
CREATE TABLE IF NOT EXISTS `governance_spaces` (
    `id` varchar(36) NOT NULL,
    `tenant_id` varchar(36) NOT NULL,
    `name` varchar(255) NOT NULL,
    `slug` varchar(255) NOT NULL,
    `color` varchar(50),
    `icon` varchar(50),
    `created_at` timestamp NOT NULL DEFAULT (now()),
    `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    `archived_at` timestamp,
    CONSTRAINT `governance_spaces_id` PRIMARY KEY (`id`),
    KEY `idx_gov_spaces_tenant` (`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `governance_projects` (
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
    CONSTRAINT `governance_projects_id` PRIMARY KEY (`id`),
    KEY `idx_gov_proj_tenant_space` (`tenant_id`, `space_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `governance_lists` (
    `id` varchar(36) NOT NULL,
    `tenant_id` varchar(36) NOT NULL,
    `project_id` varchar(36) NOT NULL,
    `name` varchar(255) NOT NULL,
    `type` varchar(30) NOT NULL DEFAULT 'todo',
    `sort_order` int NOT NULL DEFAULT 0,
    `created_at` timestamp NOT NULL DEFAULT (now()),
    `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `governance_lists_id` PRIMARY KEY (`id`),
    KEY `idx_gov_lists_tenant_proj` (`tenant_id`, `project_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `governance_tasks` (
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
    `task_type` varchar(50) NOT NULL DEFAULT 'task',
    `incident_source` varchar(100),
    `incident_severity` varchar(50),
    `created_at` timestamp NOT NULL DEFAULT (now()),
    `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    `archived_at` timestamp,
    CONSTRAINT `governance_tasks_id` PRIMARY KEY (`id`),
    KEY `idx_gov_tasks_tenant_proj` (`tenant_id`, `project_id`),
    KEY `idx_gov_tasks_tenant_assignee` (`tenant_id`, `assignee_user_id`),
    KEY `idx_gov_tasks_tenant_status` (`tenant_id`, `status`),
    KEY `idx_gov_tasks_tenant_due_at` (`tenant_id`, `due_at`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `governance_task_events` (
    `id` varchar(36) NOT NULL,
    `tenant_id` varchar(36) NOT NULL,
    `task_id` varchar(36) NOT NULL,
    `actor_user_id` varchar(36),
    `event_type` varchar(50) NOT NULL,
    `payload_json` json NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT `governance_task_events_id` PRIMARY KEY (`id`),
    KEY `idx_gov_events_tenant_task` (`tenant_id`, `task_id`)
);
--> statement-breakpoint
ALTER TABLE `governance_projects` ADD `ecommerce_metadata` json;
