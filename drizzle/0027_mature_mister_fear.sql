CREATE TABLE `ai_eval_runs` (
	`id` varchar(36) NOT NULL,
	`prompt_id` varchar(128) NOT NULL,
	`prompt_version` varchar(50) NOT NULL,
	`model` varchar(100) NOT NULL,
	`score` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`report_json` json NOT NULL,
	CONSTRAINT `ai_eval_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_ledger` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(32) NOT NULL,
	`amount_usd` decimal(12,6),
	`metadata` json,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `billing_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` varchar(36) NOT NULL,
	`name` varchar(64) NOT NULL,
	`monthly_price_usd` decimal(12,6) NOT NULL,
	`monthly_budget_usd` decimal(12,6) NOT NULL,
	`soft_limit_percent` int NOT NULL DEFAULT 80,
	`hard_limit_percent` int NOT NULL DEFAULT 100,
	`active` int NOT NULL DEFAULT 1,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`id` varchar(128) NOT NULL,
	`stripe_event_id` varchar(128) NOT NULL,
	`received_at` timestamp NOT NULL,
	`type` varchar(128) NOT NULL,
	`stripe_created_at` timestamp,
	`payload_hash` varchar(64),
	CONSTRAINT `stripe_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_stripe_events_event_id` UNIQUE(`stripe_event_id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_collections` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_document_tags` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`tag` varchar(128) NOT NULL,
	CONSTRAINT `tenant_document_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_document_versions` (
	`id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`object_key` varchar(512) NOT NULL,
	`mime_type` varchar(128) NOT NULL,
	`size_bytes` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`status` enum('uploaded','queued','processing','ready','failed') NOT NULL DEFAULT 'uploaded',
	`extracted_text_preview` text,
	`extracted_meta_json` json,
	`error_code` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_document_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_tenant_docs_tenant_sha256` UNIQUE(`tenant_id`,`sha256`)
);
--> statement-breakpoint
CREATE TABLE `tenant_documents` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`collection_id` varchar(36),
	`is_sensitive` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_ingestion_jobs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`version_id` varchar(36) NOT NULL,
	`status` enum('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_ingestion_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_subscriptions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`plan_id` varchar(36) NOT NULL,
	`status` varchar(32) NOT NULL,
	`started_at` timestamp NOT NULL,
	`ended_at` timestamp,
	`stripe_customer_id` varchar(128),
	`stripe_subscription_id` varchar(128),
	`last_payment_failed_at` timestamp,
	`cancel_at_period_end` boolean NOT NULL DEFAULT false,
	`current_period_end` timestamp,
	CONSTRAINT `tenant_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_tenant_subscriptions_tenant` UNIQUE(`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` varchar(36) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`external_id` varchar(128) NOT NULL,
	`received_at` timestamp NOT NULL,
	`payload_hash` varchar(128) NOT NULL,
	`processed_at` timestamp,
	`status` varchar(32) NOT NULL,
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_webhook_events_provider_external` UNIQUE(`provider`,`external_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ai_eval_runs_prompt_id` ON `ai_eval_runs` (`prompt_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_eval_runs_created_at` ON `ai_eval_runs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_billing_ledger_tenant` ON `billing_ledger` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_billing_ledger_tenant_created` ON `billing_ledger` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_tenant_docs_tags_doc` ON `tenant_document_tags` (`tenant_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `idx_tenant_docs_tenant_status` ON `tenant_document_versions` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tenant_documents_tenant_created` ON `tenant_documents` (`tenant_id`,`created_at`);