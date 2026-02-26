CREATE TABLE `admin_audit_log` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`action` varchar(64) NOT NULL,
	`metadata` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `admin_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attribution_clicks` (
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
	`consumed_at` timestamp,
	CONSTRAINT `attribution_clicks_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_attribution_clicks_token` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `inbound_message_dedup` (
	`message_sid` varchar(64) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inbound_message_dedup_message_sid` PRIMARY KEY(`message_sid`)
);
--> statement-breakpoint
CREATE TABLE `metrics_daily` (
	`tenant_id` varchar(36) NOT NULL,
	`day_date` date NOT NULL,
	`utm_source` varchar(255) NOT NULL DEFAULT '(none)',
	`utm_campaign` varchar(255) NOT NULL DEFAULT '(none)',
	`total_events` int NOT NULL DEFAULT 0,
	`funnel_started` int NOT NULL DEFAULT 0,
	`freight_simulations` int NOT NULL DEFAULT 0,
	`consumed_tokens` int NOT NULL DEFAULT 0,
	`click_tokens` int NOT NULL DEFAULT 0,
	CONSTRAINT `pk_metrics_daily` PRIMARY KEY(`tenant_id`,`day_date`,`utm_source`,`utm_campaign`)
);
--> statement-breakpoint
CREATE TABLE `metrics_rollup_status` (
	`tenant_id` varchar(36) NOT NULL,
	`last_day_processed` date,
	`last_run_at` datetime,
	`last_duration_ms` int,
	`last_rows_written` int,
	`status` enum('ok','error') NOT NULL DEFAULT 'ok',
	`last_error_code` varchar(64),
	CONSTRAINT `metrics_rollup_status_tenant_id` PRIMARY KEY(`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_saved_views` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`module` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`filters_json` text NOT NULL,
	`created_by_user_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_saved_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_saved_views_tenant_module_name` UNIQUE(`tenant_id`,`module`,`name`)
);
--> statement-breakpoint
ALTER TABLE `freight_funnel_events` ADD `phone_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `freight_funnel_events` ADD `phone_encrypted` text;--> statement-breakpoint
ALTER TABLE `freight_funnel_events` ADD `utm_source` varchar(255);--> statement-breakpoint
ALTER TABLE `freight_funnel_events` ADD `utm_medium` varchar(255);--> statement-breakpoint
ALTER TABLE `freight_funnel_events` ADD `utm_campaign` varchar(255);--> statement-breakpoint
ALTER TABLE `freight_funnel_events` ADD `utm_term` varchar(255);--> statement-breakpoint
ALTER TABLE `freight_funnel_events` ADD `utm_content` varchar(255);--> statement-breakpoint
ALTER TABLE `freight_funnel_events` ADD `ref_token` varchar(128);--> statement-breakpoint
ALTER TABLE `freight_funnel_events` ADD `click_id` varchar(255);--> statement-breakpoint
ALTER TABLE `freight_simulation_logs` ADD `utm_source` varchar(255);--> statement-breakpoint
ALTER TABLE `freight_simulation_logs` ADD `utm_medium` varchar(255);--> statement-breakpoint
ALTER TABLE `freight_simulation_logs` ADD `utm_campaign` varchar(255);--> statement-breakpoint
ALTER TABLE `freight_simulation_logs` ADD `utm_term` varchar(255);--> statement-breakpoint
ALTER TABLE `freight_simulation_logs` ADD `utm_content` varchar(255);--> statement-breakpoint
ALTER TABLE `freight_simulation_logs` ADD `ref_token` varchar(128);--> statement-breakpoint
ALTER TABLE `freight_simulation_logs` ADD `click_id` varchar(255);--> statement-breakpoint
ALTER TABLE `messages` ADD `phone_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `messages` ADD `phone_encrypted` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `body_encrypted` text;--> statement-breakpoint
ALTER TABLE `public_events` ADD `utm_source` varchar(255);--> statement-breakpoint
ALTER TABLE `public_events` ADD `utm_medium` varchar(255);--> statement-breakpoint
ALTER TABLE `public_events` ADD `utm_campaign` varchar(255);--> statement-breakpoint
ALTER TABLE `public_events` ADD `utm_term` varchar(255);--> statement-breakpoint
ALTER TABLE `public_events` ADD `utm_content` varchar(255);--> statement-breakpoint
ALTER TABLE `public_events` ADD `ref_token` varchar(128);--> statement-breakpoint
ALTER TABLE `public_events` ADD `click_id` varchar(255);--> statement-breakpoint
ALTER TABLE `tenants` ADD `timezone` varchar(64) DEFAULT 'America/Sao_Paulo' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_tenant_created_at` ON `admin_audit_log` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_user_created_at` ON `admin_audit_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_action_created_at` ON `admin_audit_log` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_attribution_clicks_tenant_created_at` ON `attribution_clicks` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_attribution_clicks_consumed_at` ON `attribution_clicks` (`consumed_at`);--> statement-breakpoint
CREATE INDEX `idx_inbound_message_dedup_tenant_created_at` ON `inbound_message_dedup` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_inbound_message_dedup_created_at` ON `inbound_message_dedup` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_metrics_daily_tenant_day` ON `metrics_daily` (`tenant_id`,`day_date`);--> statement-breakpoint
CREATE INDEX `idx_metrics_daily_tenant_source_day` ON `metrics_daily` (`tenant_id`,`utm_source`,`day_date`);--> statement-breakpoint
CREATE INDEX `idx_metrics_daily_tenant_campaign_day` ON `metrics_daily` (`tenant_id`,`utm_campaign`,`day_date`);--> statement-breakpoint
CREATE INDEX `idx_saved_views_tenant_module_updated_at` ON `tenant_saved_views` (`tenant_id`,`module`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_funnel_tenant_phone_hash_time` ON `freight_funnel_events` (`tenant_id`,`phone_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_messages_tenant_phone_hash_created_at` ON `messages` (`tenant_id`,`phone_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_public_events_utm_source_time` ON `public_events` (`tenant_id`,`utm_source`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_public_events_utm_campaign_time` ON `public_events` (`tenant_id`,`utm_campaign`,`created_at`);--> statement-breakpoint
ALTER TABLE `tenant_ai_providers` DROP COLUMN `api_key`;