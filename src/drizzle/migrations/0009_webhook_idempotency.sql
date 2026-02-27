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
