CREATE TABLE IF NOT EXISTS `inbound_message_dedup` (
	`message_sid` varchar(64) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inbound_message_dedup_message_sid` PRIMARY KEY(`message_sid`)
);
--> statement-breakpoint
CREATE INDEX `idx_inbound_message_dedup_tenant_created_at` ON `inbound_message_dedup` (`tenant_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_inbound_message_dedup_created_at` ON `inbound_message_dedup` (`created_at`);

