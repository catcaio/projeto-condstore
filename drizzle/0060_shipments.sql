CREATE TABLE `shipments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`carrier` varchar(100) NOT NULL,
	`service` varchar(100),
	`tracking_code` varchar(100),
	`tracking_url` varchar(255),
	`status` varchar(30) NOT NULL DEFAULT 'CREATED',
	`estimated_delivery` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_shipments_tenant_order` ON `shipments` (`tenant_id`,`order_id`);
