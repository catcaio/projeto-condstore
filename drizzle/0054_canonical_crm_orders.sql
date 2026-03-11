CREATE TABLE `customers` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`segment` varchar(50),
	`status` varchar(50) NOT NULL DEFAULT 'ativo',
	`owner_id` varchar(36),
	`activity_bucket` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_customers_tenant_org` UNIQUE(`tenant_id`,`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `customer_contacts` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(30),
	`role` varchar(100),
	`is_primary` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'recebido',
	`priority` varchar(50) NOT NULL DEFAULT 'media',
	`channel` varchar(50),
	`total_amount` decimal(12,2),
	`owner_id` varchar(36),
	`freight_simulation_id` varchar(36),
	`freight_confirmation_id` varchar(36),
	`logistics_status` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`sku` varchar(100),
	`name` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(12,2),
	`subtotal` decimal(12,2),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`previous_status` varchar(50),
	`new_status` varchar(50) NOT NULL,
	`reason` varchar(255),
	`changed_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `freight_shipments` ADD COLUMN `order_id` varchar(36);
--> statement-breakpoint
CREATE INDEX `idx_customer_contacts_tenant_customer` ON `customer_contacts` (`tenant_id`,`customer_id`);
--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_customer` ON `orders` (`tenant_id`,`customer_id`);
--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_status` ON `orders` (`tenant_id`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_order_items_tenant_order` ON `order_items` (`tenant_id`,`order_id`);
--> statement-breakpoint
CREATE INDEX `idx_order_status_history_tenant_order` ON `order_status_history` (`tenant_id`,`order_id`);
--> statement-breakpoint
CREATE INDEX `idx_freight_shipments_tenant_order` ON `freight_shipments` (`tenant_id`,`order_id`);
