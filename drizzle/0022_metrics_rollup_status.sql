CREATE TABLE IF NOT EXISTS `metrics_rollup_status` (
	`tenant_id` varchar(36) NOT NULL,
	`last_day_processed` date DEFAULT NULL,
	`last_run_at` datetime DEFAULT NULL,
	`last_duration_ms` int DEFAULT NULL,
	`last_rows_written` int DEFAULT NULL,
	`status` enum('ok','error') NOT NULL DEFAULT 'ok',
	`last_error_code` varchar(64) DEFAULT NULL,
	CONSTRAINT `pk_metrics_rollup_status` PRIMARY KEY(`tenant_id`)
);
