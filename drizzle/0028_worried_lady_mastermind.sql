CREATE TABLE `tenant_document_chunks` (
	`id` varchar(36) NOT NULL,
	`version_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`page_number` int,
	`pii_risk_score` decimal(5,2) NOT NULL DEFAULT '0',
	`order_index` int NOT NULL,
	`embedding` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_document_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tenant_document_versions` MODIFY COLUMN `status` enum('uploaded','queued','processing','ready','ready_indexed','failed') NOT NULL DEFAULT 'uploaded';--> statement-breakpoint
CREATE INDEX `idx_tenant_chunks_tenant_version` ON `tenant_document_chunks` (`tenant_id`,`version_id`);