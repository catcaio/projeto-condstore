CREATE TABLE `frank_execution_runs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`execution_id` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`trigger_source` varchar(50) NOT NULL DEFAULT 'OBSERVER',
	`status` varchar(30) NOT NULL DEFAULT 'PENDING',
	`current_step` varchar(100),
	`autonomy_level` varchar(30) NOT NULL DEFAULT 'OBSERVE',
	`context_json` json,
	`result_json` json,
	`error_msg` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `frank_execution_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `frank_execution_runs_execution_id_unique` UNIQUE(`execution_id`)
);
--> statement-breakpoint
CREATE TABLE `frank_execution_steps` (
	`id` varchar(36) NOT NULL,
	`execution_run_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`step_number` int NOT NULL,
	`step_name` varchar(100) NOT NULL,
	`action_type` varchar(100) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'PENDING',
	`input_payload` json,
	`output_payload` json,
	`tool_calls_json` json,
	`risk_class` varchar(30) NOT NULL DEFAULT 'SAFE',
	`requires_human_approval` boolean NOT NULL DEFAULT false,
	`approved_by` varchar(100),
	`approved_at` timestamp,
	`error_msg` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `frank_execution_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_frank_exec_run_tenant_status` ON `frank_execution_runs` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_frank_exec_run_tenant_created` ON `frank_execution_runs` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_exec_step_run` ON `frank_execution_steps` (`execution_run_id`,`step_number`);--> statement-breakpoint
CREATE INDEX `idx_frank_exec_step_tenant_status` ON `frank_execution_steps` (`tenant_id`,`status`);