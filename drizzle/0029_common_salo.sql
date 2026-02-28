CREATE TABLE `tenant_knowledge_queries` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`question_hash` varchar(64) NOT NULL,
	`question_preview` varchar(200) NOT NULL,
	`confidence` decimal(5,4) NOT NULL,
	`citations_json` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`request_id` varchar(128),
	CONSTRAINT `tenant_knowledge_queries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tenant_collections` ADD `source_type` varchar(32) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenant_collections` ADD `connector_type` varchar(32);--> statement-breakpoint
ALTER TABLE `tenant_collections` ADD `auto_sync` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tenant_collections` ADD `last_sync_at` timestamp;--> statement-breakpoint
ALTER TABLE `tenant_collections` ADD `sync_status` varchar(32) DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenant_collections` ADD `connector_config` json;--> statement-breakpoint
ALTER TABLE `tenant_document_chunks` ADD `char_start` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tenant_document_chunks` ADD `char_end` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_tenant_knowledge_queries_tenant_created` ON `tenant_knowledge_queries` (`tenant_id`,`created_at`);