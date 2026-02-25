CREATE TABLE IF NOT EXISTS `admin_audit_log` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`action` varchar(64) NOT NULL,
	`metadata` json DEFAULT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `pk_admin_audit_log` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_tenant_created_at` ON `admin_audit_log` (`tenant_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_user_created_at` ON `admin_audit_log` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_action_created_at` ON `admin_audit_log` (`action`,`created_at`);
