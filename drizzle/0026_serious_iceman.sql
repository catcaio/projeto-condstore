CREATE TABLE `ai_prompts` (
	`id` varchar(128) NOT NULL,
	`version` varchar(50) NOT NULL,
	`system` text NOT NULL,
	`temperature` decimal(3,2) NOT NULL DEFAULT '0.7',
	`max_tokens` int NOT NULL DEFAULT 1000,
	`active` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `pk_ai_prompts_id_version` PRIMARY KEY(`id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `finops_alert_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`prev_state` varchar(50) NOT NULL,
	`next_state` varchar(50) NOT NULL,
	`reason` varchar(100) NOT NULL,
	`projected_days_to_hard_limit` decimal(10,2),
	`current_month_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`monthly_budget_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`burn_rate_per_day` decimal(12,6),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `finops_alert_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finops_lock_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`locked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`current_month_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`monthly_budget_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`burn_rate_per_day` decimal(12,6),
	`resolved_at` timestamp,
	`resolution_type` varchar(50),
	CONSTRAINT `finops_lock_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finops_monthly_resets` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`reset_month` varchar(10) NOT NULL,
	`prev_current_month_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`prev_burn_rate_per_day` decimal(12,6),
	`performed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `finops_monthly_resets_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_finops_monthly_resets_tenant_month` UNIQUE(`tenant_id`,`reset_month`)
);
--> statement-breakpoint
CREATE TABLE `tenant_budgets` (
	`tenant_id` varchar(36) NOT NULL,
	`monthly_token_limit` int NOT NULL DEFAULT 1000000,
	`tokens_consumed` int NOT NULL DEFAULT 0,
	`current_lock_state` varchar(20) NOT NULL DEFAULT 'unlocked',
	`state_revision` int NOT NULL DEFAULT 1,
	`monthly_budget_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`soft_limit_percent` int NOT NULL DEFAULT 80,
	`hard_limit_percent` int NOT NULL DEFAULT 100,
	`current_month_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`burn_rate_per_day` decimal(12,6),
	`last_budget_reset_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_budgets_tenant_id` PRIMARY KEY(`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_usage_metrics` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`date` date NOT NULL,
	`total_requests` int NOT NULL DEFAULT 0,
	`total_tool_calls` int NOT NULL DEFAULT 0,
	`total_tokens_input` int NOT NULL DEFAULT 0,
	`total_tokens_output` int NOT NULL DEFAULT 0,
	`estimated_cost_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`model_distribution_json` json NOT NULL DEFAULT ('{}'),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_usage_metrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_tenant_usage_metrics_tenant_date` UNIQUE(`tenant_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `token_usage_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`trace_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`model_used` varchar(100) NOT NULL DEFAULT 'unknown',
	`input_tokens` int NOT NULL DEFAULT 0,
	`output_tokens` int NOT NULL DEFAULT 0,
	`estimated_cost_usd` decimal(10,6) NOT NULL DEFAULT '0',
	`processed_by_worker` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `token_usage_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_token_usage_events_trace_id` UNIQUE(`trace_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ai_prompts_active` ON `ai_prompts` (`active`);--> statement-breakpoint
CREATE INDEX `idx_finops_alert_events_tenant_created` ON `finops_alert_events` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_finops_alert_events_tenant_state` ON `finops_alert_events` (`tenant_id`,`next_state`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_finops_lock_events_tenant_active` ON `finops_lock_events` (`tenant_id`,`resolved_at`);--> statement-breakpoint
CREATE INDEX `idx_tenant_usage_metrics_tenant_date_q` ON `tenant_usage_metrics` (`tenant_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_token_usage_events_tenant_created_at` ON `token_usage_events` (`tenant_id`,`created_at`);