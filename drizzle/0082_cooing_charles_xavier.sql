CREATE TABLE `frank_execution_turns` (
	`id` varchar(36) NOT NULL,
	`run_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`turn` int NOT NULL,
	`envelope_json` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `frank_execution_turns_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_frank_exec_turn_run_turn` UNIQUE(`run_id`,`turn`)
);
--> statement-breakpoint
ALTER TABLE `frank_execution_runs` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `frank_execution_steps` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_frank_exec_turn_run_turn` ON `frank_execution_turns` (`run_id`,`turn`);