ALTER TABLE `customer_contacts` ADD `organization_id` varchar(36);--> statement-breakpoint
ALTER TABLE `customer_contacts` ADD `email_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `customer_contacts` ADD `email_encrypted` varchar(255);--> statement-breakpoint
ALTER TABLE `customer_contacts` ADD `phone_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `customer_contacts` ADD `phone_encrypted` varchar(255);--> statement-breakpoint
CREATE INDEX `idx_customer_contacts_phone_hash` ON `customer_contacts` (`phone_hash`);--> statement-breakpoint
CREATE INDEX `idx_customer_contacts_tenant_phone` ON `customer_contacts` (`tenant_id`,`phone_hash`);--> statement-breakpoint
ALTER TABLE `customer_contacts` DROP COLUMN `email`;--> statement-breakpoint
ALTER TABLE `customer_contacts` DROP COLUMN `phone`;