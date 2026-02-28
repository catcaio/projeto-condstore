CREATE TABLE `tenant_knowledge_sources` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenant_knowledge_sources_id` PRIMARY KEY(`id`)
);
