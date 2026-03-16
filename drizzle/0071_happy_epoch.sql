ALTER TABLE `ecosystem_events` MODIFY COLUMN `type` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `ecosystem_events` MODIFY COLUMN `entity_type` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `ecosystem_events` MODIFY COLUMN `entity_id` varchar(255);--> statement-breakpoint
ALTER TABLE `ecosystem_events` MODIFY COLUMN `payload_json` json;--> statement-breakpoint
ALTER TABLE `ecosystem_events` MODIFY COLUMN `actor` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `ecosystem_events` MODIFY COLUMN `source` varchar(100) NOT NULL;