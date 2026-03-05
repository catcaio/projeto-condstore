CREATE TABLE `couriers` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone_hash` varchar(64) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `couriers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`order_ref` varchar(128) NOT NULL,
	`courier_id` varchar(36),
	`status` varchar(50) NOT NULL DEFAULT 'created',
	`started_at` timestamp,
	`completed_at` timestamp,
	`last_lat` decimal(10,8),
	`last_lng` decimal(11,8),
	`last_update_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_location_events` (
	`id` varchar(36) NOT NULL,
	`delivery_id` varchar(36) NOT NULL,
	`lat` decimal(10,8) NOT NULL,
	`lng` decimal(11,8) NOT NULL,
	`accuracy` int,
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `delivery_location_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_couriers_tenant` ON `couriers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_couriers_phone_hash` ON `couriers` (`phone_hash`);--> statement-breakpoint
CREATE INDEX `idx_deliveries_tenant_status` ON `deliveries` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_deliveries_courier_id` ON `deliveries` (`courier_id`);--> statement-breakpoint
CREATE INDEX `idx_deliveries_tenant_order` ON `deliveries` (`tenant_id`,`order_ref`);--> statement-breakpoint
CREATE INDEX `idx_delivery_location_events_delivery_time` ON `delivery_location_events` (`delivery_id`,`recorded_at`);