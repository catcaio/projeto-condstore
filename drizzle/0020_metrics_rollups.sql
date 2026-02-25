CREATE TABLE IF NOT EXISTS `metrics_daily` (
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
CREATE INDEX `idx_metrics_daily_tenant_day` ON `metrics_daily` (`tenant_id`,`day_date`);
--> statement-breakpoint
CREATE INDEX `idx_metrics_daily_tenant_source_day` ON `metrics_daily` (`tenant_id`,`utm_source`,`day_date`);
--> statement-breakpoint
CREATE INDEX `idx_metrics_daily_tenant_campaign_day` ON `metrics_daily` (`tenant_id`,`utm_campaign`,`day_date`);
