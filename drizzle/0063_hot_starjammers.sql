ALTER TABLE `tenant_signup_policies` MODIFY COLUMN `allowed_domains` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `tenant_signup_policies` MODIFY COLUMN `allowed_emails` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `governance_tasks` ADD `task_type` varchar(50) DEFAULT 'task' NOT NULL;--> statement-breakpoint
ALTER TABLE `governance_tasks` ADD `incident_source` varchar(100);--> statement-breakpoint
ALTER TABLE `governance_tasks` ADD `incident_severity` varchar(50);--> statement-breakpoint
CREATE INDEX `idx_gov_tasks_type_source` ON `governance_tasks` (`tenant_id`,`task_type`,`incident_source`);