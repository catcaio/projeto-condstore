CREATE TABLE `customer_accounts` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`role` varchar(50) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_timeline_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(128) NOT NULL,
	`status` varchar(100) NOT NULL,
	`message_public` text NOT NULL,
	`metadata_json` json,
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_timeline_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_proofs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`shipment_id` varchar(128) NOT NULL,
	`photo_url` text,
	`receiver_name` varchar(255),
	`signed_at` timestamp,
	`geo_hash` varchar(64),
	`metadata_json` json,
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `delivery_proofs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`order_id` varchar(128),
	`amount_cents` int NOT NULL,
	`due_date` timestamp NOT NULL,
	`status` varchar(50) NOT NULL,
	`boleto_url` text,
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`legal_name` varchar(255) NOT NULL,
	`trade_name` varchar(255),
	`cnpj_hash` varchar(64) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`address_redacted` text,
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_customer_accounts_user_id` ON `customer_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_customer_accounts_organization_id` ON `customer_accounts` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_customer_timeline_tenant_org_created` ON `customer_timeline_events` (`tenant_id`,`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_customer_timeline_entity` ON `customer_timeline_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_delivery_proofs_shipment_id` ON `delivery_proofs` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `idx_invoices_organization_id` ON `invoices` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_organizations_tenant_id` ON `organizations` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_organizations_cnpj_hash` ON `organizations` (`cnpj_hash`);--> statement-breakpoint
CREATE INDEX `idx_sites_organization_id` ON `sites` (`organization_id`);