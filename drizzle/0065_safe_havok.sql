ALTER TABLE `governance_tasks` ADD `task_type` varchar(50) DEFAULT 'task' NOT NULL;--> statement-breakpoint
ALTER TABLE `governance_tasks` ADD `incident_source` varchar(100);--> statement-breakpoint
ALTER TABLE `governance_tasks` ADD `incident_severity` varchar(50);