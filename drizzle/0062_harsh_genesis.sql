ALTER TABLE `messages` RENAME COLUMN `from_phone` TO `from_phone_hash`;--> statement-breakpoint
ALTER TABLE `messages` MODIFY COLUMN `from_phone_hash` varchar(64) NOT NULL;