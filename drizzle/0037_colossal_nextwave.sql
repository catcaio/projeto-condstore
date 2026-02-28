ALTER TABLE `domine_events` ADD `attempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `domine_events` ADD `next_retry_at` timestamp;--> statement-breakpoint
CREATE INDEX `idx_domine_events_next_retry` ON `domine_events` (`next_retry_at`);