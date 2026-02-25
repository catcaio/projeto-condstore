ALTER TABLE `messages`
	ADD COLUMN `phone_hash` varchar(64) DEFAULT NULL,
	ADD COLUMN `phone_encrypted` text DEFAULT NULL,
	ADD COLUMN `body_encrypted` text DEFAULT NULL;
--> statement-breakpoint
CREATE INDEX `idx_messages_tenant_phone_hash_created_at` ON `messages` (`tenant_id`,`phone_hash`,`created_at`);
--> statement-breakpoint
ALTER TABLE `freight_funnel_events`
	ADD COLUMN `phone_hash` varchar(64) DEFAULT NULL,
	ADD COLUMN `phone_encrypted` text DEFAULT NULL;
--> statement-breakpoint
CREATE INDEX `idx_funnel_tenant_phone_hash_time` ON `freight_funnel_events` (`tenant_id`,`phone_hash`,`created_at`);
