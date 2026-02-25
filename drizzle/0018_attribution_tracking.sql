ALTER TABLE `public_events`
	ADD COLUMN IF NOT EXISTS `utm_source` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_medium` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_campaign` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_term` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_content` varchar(255),
	ADD COLUMN IF NOT EXISTS `ref_token` varchar(128),
	ADD COLUMN IF NOT EXISTS `click_id` varchar(255);
--> statement-breakpoint
CREATE INDEX `idx_public_events_utm_source_time` ON `public_events` (`tenant_id`,`utm_source`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_public_events_utm_campaign_time` ON `public_events` (`tenant_id`,`utm_campaign`,`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attribution_clicks` (
	`id` varchar(36) NOT NULL,
	`token` varchar(128) NOT NULL,
	`tenant_id` varchar(36),
	`utm_source` varchar(255),
	`utm_medium` varchar(255),
	`utm_campaign` varchar(255),
	`utm_term` varchar(255),
	`utm_content` varchar(255),
	`click_id` varchar(255),
	`landing_url` varchar(2048),
	`user_agent_hash` varchar(64),
	`ip_hash` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`consumed_at` timestamp NULL,
	CONSTRAINT `attribution_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attribution_clicks_token` ON `attribution_clicks` (`token`);
--> statement-breakpoint
CREATE INDEX `idx_attribution_clicks_tenant_created_at` ON `attribution_clicks` (`tenant_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_attribution_clicks_consumed_at` ON `attribution_clicks` (`consumed_at`);
--> statement-breakpoint
ALTER TABLE `freight_funnel_events`
	ADD COLUMN IF NOT EXISTS `utm_source` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_medium` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_campaign` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_term` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_content` varchar(255),
	ADD COLUMN IF NOT EXISTS `ref_token` varchar(128),
	ADD COLUMN IF NOT EXISTS `click_id` varchar(255);
--> statement-breakpoint
ALTER TABLE `freight_simulation_logs`
	ADD COLUMN IF NOT EXISTS `utm_source` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_medium` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_campaign` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_term` varchar(255),
	ADD COLUMN IF NOT EXISTS `utm_content` varchar(255),
	ADD COLUMN IF NOT EXISTS `ref_token` varchar(128),
	ADD COLUMN IF NOT EXISTS `click_id` varchar(255);
