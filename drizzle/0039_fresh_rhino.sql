ALTER TABLE `tenants` ADD `slug` varchar(255);--> statement-breakpoint
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`);