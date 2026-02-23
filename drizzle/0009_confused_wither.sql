CREATE TABLE `ai_decision_logs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`message_id` varchar(64) NOT NULL,
	`provider_event_id` varchar(64),
	`provider` varchar(30) NOT NULL,
	`model` varchar(255) NOT NULL,
	`intent` varchar(50) NOT NULL,
	`confidence` decimal(5,4),
	`tool_used` varchar(100),
	`tool_payload` text,
	`tokens_in` int,
	`tokens_out` int,
	`latency_ms` int,
	`response_type` varchar(30) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ai_decision_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_ai_providers` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`provider_type` varchar(30) NOT NULL,
	`base_url` varchar(255) NOT NULL,
	`model` varchar(255) NOT NULL,
	`embed_model` varchar(255) NOT NULL,
	`api_key` varchar(512),
	`api_key_encrypted` varchar(512),
	`is_enabled` int NOT NULL DEFAULT 1,
	`timeout_ms` int NOT NULL DEFAULT 20000,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_ai_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ai_decision_logs_tenant_created_at` ON `ai_decision_logs` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_tenant_ai_providers_tenant_id` ON `tenant_ai_providers` (`tenant_id`);