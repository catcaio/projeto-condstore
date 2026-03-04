CREATE TABLE `domine_freight_quotes` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`correlation_id` varchar(100) NOT NULL,
	`request_id` varchar(100),
	`source` varchar(50) NOT NULL,
	`origin_zip` varchar(20),
	`dest_zip` varchar(20),
	`weight` int,
	`dims` varchar(100),
	`quotes_json_redacted` json,
	`best_carrier` varchar(100),
	`best_price_cents` int,
	`best_eta_days` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domine_freight_quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_domine_freight_quotes_correlation` UNIQUE(`tenant_id`,`correlation_id`)
);
