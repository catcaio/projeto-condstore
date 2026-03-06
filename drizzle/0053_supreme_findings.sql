CREATE TABLE `supreme_findings` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`finding_type` varchar(80) NOT NULL,
	`finding_domain` varchar(40) NOT NULL,
	`severity` varchar(20) NOT NULL,
	`title` varchar(160) NOT NULL,
	`summary` text NOT NULL,
	`evidence` json NOT NULL,
	`recommended_action_type` varchar(80),
	`recommended_action_payload` json,
	`status` varchar(40) NOT NULL DEFAULT 'OPEN',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`resolved_at` timestamp,
	CONSTRAINT `pk_supreme_findings` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sf_tenant_status_time` ON `supreme_findings` (`tenant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sf_tenant_domain_time` ON `supreme_findings` (`tenant_id`,`finding_domain`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sf_tenant_severity_time` ON `supreme_findings` (`tenant_id`,`severity`,`created_at`);
