DROP INDEX `idx_tenant_type_status` ON `governance_tasks`;--> statement-breakpoint
DROP INDEX `idx_tenant_incident` ON `governance_tasks`;--> statement-breakpoint
ALTER TABLE `governance_tasks` DROP COLUMN `task_type`;--> statement-breakpoint
ALTER TABLE `governance_tasks` DROP COLUMN `incident_severity`;--> statement-breakpoint
ALTER TABLE `governance_tasks` DROP COLUMN `incident_source`;--> statement-breakpoint
ALTER TABLE `governance_tasks` DROP COLUMN `incident_impact`;--> statement-breakpoint
ALTER TABLE `governance_tasks` DROP COLUMN `incident_status`;