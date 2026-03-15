ALTER TABLE `tenant_signup_policies` MODIFY COLUMN `allowed_domains` json;--> statement-breakpoint
ALTER TABLE `tenant_signup_policies` MODIFY COLUMN `allowed_emails` json;--> statement-breakpoint
ALTER TABLE `governance_tasks` ADD `task_type` varchar(30) DEFAULT 'ops_task' NOT NULL;--> statement-breakpoint
ALTER TABLE `governance_tasks` ADD `incident_severity` varchar(30);--> statement-breakpoint
ALTER TABLE `governance_tasks` ADD `incident_source` varchar(255);--> statement-breakpoint
ALTER TABLE `governance_tasks` ADD `incident_impact` text;--> statement-breakpoint
ALTER TABLE `governance_tasks` ADD `incident_status` varchar(50);--> statement-breakpoint
CREATE INDEX `idx_tenant_type_status` ON `governance_tasks` (`tenant_id`,`task_type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tenant_incident` ON `governance_tasks` (`tenant_id`,`incident_status`,`incident_severity`);