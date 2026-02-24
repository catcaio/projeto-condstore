CREATE TABLE `frank_rollout_decisions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(100) NOT NULL,
	`baseline` varchar(50) NOT NULL,
	`candidate` varchar(50) NOT NULL,
	`decision` varchar(30) NOT NULL,
	`applied` int NOT NULL DEFAULT 0,
	`dry_run` int NOT NULL DEFAULT 1,
	`reasons_json` json,
	`metrics_json` json,
	`request_id` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `frank_rollout_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_frank_rollout_decisions_tenant_id` ON `frank_rollout_decisions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_frank_rollout_decisions_request_id` ON `frank_rollout_decisions` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_frank_rollout_decisions_created_at` ON `frank_rollout_decisions` (`created_at`);--> statement-breakpoint
