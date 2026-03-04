ALTER TABLE `domine_tenant_intake_configs` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `domine_tenant_intake_configs` MODIFY COLUMN `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `domine_intake_events` MODIFY COLUMN `received_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `public_events` DROP INDEX `idx_public_events_utm_source_time`;--> statement-breakpoint
ALTER TABLE `public_events` DROP INDEX `idx_public_events_utm_campaign_time`;--> statement-breakpoint
ALTER TABLE `public_events` DROP COLUMN `utm_source`;--> statement-breakpoint
ALTER TABLE `public_events` DROP COLUMN `utm_medium`;--> statement-breakpoint
ALTER TABLE `public_events` DROP COLUMN `utm_campaign`;--> statement-breakpoint
ALTER TABLE `public_events` DROP COLUMN `utm_term`;--> statement-breakpoint
ALTER TABLE `public_events` DROP COLUMN `utm_content`;--> statement-breakpoint
ALTER TABLE `public_events` DROP COLUMN `ref_token`;--> statement-breakpoint
ALTER TABLE `public_events` DROP COLUMN `click_id`;