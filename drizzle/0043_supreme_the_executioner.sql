CREATE TABLE `invites` (
	`id` varchar(36) NOT NULL,
	`token` varchar(128) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`role` varchar(20) NOT NULL,
	`email` varchar(255),
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `tenant_signup_policies` (
	`tenant_id` varchar(36) NOT NULL,
	`self_signup_enabled` boolean NOT NULL DEFAULT false,
	`allowed_domains` json DEFAULT NULL,
	`allowed_emails` json DEFAULT NULL,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_signup_policies_tenant_id` PRIMARY KEY(`tenant_id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `password_hash` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `name` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `auth_provider` varchar(20) DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `provider_id` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `email_verify_token` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified_at` timestamp;