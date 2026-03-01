ALTER TABLE `domine_events` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `domine_events` ADD `next_retry_at` timestamp;