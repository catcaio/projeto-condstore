CREATE TABLE `dispatch_delivery_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`status` varchar(50) NOT NULL,
	`description` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `dispatch_delivery_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dispatch_delivery_orders` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`order_ref` varchar(128) NOT NULL,
	`customer_name` varchar(255) NOT NULL,
	`customer_phone` varchar(30),
	`zip_code` varchar(20),
	`address_line` varchar(500) NOT NULL,
	`city` varchar(255),
	`state` varchar(2),
	`status` enum('pending','routed','in_transit','delivered','failed') NOT NULL DEFAULT 'pending',
	`tracking_token` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dispatch_delivery_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dispatch_delivery_route_stops` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`route_id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`sequence_index` int NOT NULL,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `dispatch_delivery_route_stops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dispatch_delivery_routes` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`technician_id` varchar(36),
	`date` date NOT NULL,
	`status` enum('draft','pending','in_progress','completed') NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dispatch_delivery_routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dispatch_technicians` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dispatch_technicians_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_dispatch_events_order_id` ON `dispatch_delivery_events` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_dispatch_orders_tenant_status` ON `dispatch_delivery_orders` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_dispatch_orders_tracking_token` ON `dispatch_delivery_orders` (`tracking_token`);