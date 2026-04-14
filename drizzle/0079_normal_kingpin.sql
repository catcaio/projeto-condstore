CREATE TABLE `frank_token_usage` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`date` date NOT NULL,
	`tokens` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `frank_token_usage_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_frank_token_usage_tenant_date` UNIQUE(`tenant_id`,`date`)
);
