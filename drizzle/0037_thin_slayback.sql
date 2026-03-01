CREATE TABLE `end_user_consents` (
	`tenant_id` varchar(36) NOT NULL,
	`phone_hash` varchar(64) NOT NULL,
	`consent_given` boolean NOT NULL DEFAULT false,
	`consent_timestamp` timestamp,
	`consent_source` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pk_end_user_consents` PRIMARY KEY(`tenant_id`,`phone_hash`)
);
--> statement-breakpoint
CREATE TABLE `user_consents_log` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`phone_hash` varchar(64) NOT NULL,
	`consent_given` boolean NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`ip_hash` varchar(64),
	`source` varchar(50),
	CONSTRAINT `user_consents_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_consents_log_tenant_phone` ON `user_consents_log` (`tenant_id`,`phone_hash`);