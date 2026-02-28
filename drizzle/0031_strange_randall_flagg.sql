CREATE TABLE `tenant_secrets` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`scope` varchar(50) NOT NULL,
	`key_name` varchar(255) NOT NULL,
	`value_encrypted` text NOT NULL,
	`value_hash` varchar(64) NOT NULL,
	`last_rotated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`rotated_by_user_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_secrets_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_tenant_secrets_scope_key` UNIQUE(`tenant_id`,`scope`,`key_name`)
);
--> statement-breakpoint
CREATE INDEX `idx_tenant_secrets_scope` ON `tenant_secrets` (`tenant_id`,`scope`);