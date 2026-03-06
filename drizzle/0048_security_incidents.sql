CREATE TABLE `security_incidents` (
	`id` varchar(36) NOT NULL,
	`reason` varchar(100) NOT NULL,
	`count` int NOT NULL,
	`route` varchar(255),
	`ip_hash` varchar(64),
	`window_start` timestamp NOT NULL,
	`window_end` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `security_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sec_incidents_created_at` ON `security_incidents` (`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_sec_incidents_reason_window` ON `security_incidents` (`reason`,`window_end`);
