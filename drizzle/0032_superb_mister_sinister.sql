DROP INDEX `idx_dispatch_events_order_id` ON `dispatch_delivery_events`;--> statement-breakpoint
DROP INDEX `idx_dispatch_orders_tracking_token` ON `dispatch_delivery_orders`;--> statement-breakpoint
ALTER TABLE `dispatch_delivery_orders` ADD `tracking_token_hash` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `dispatch_delivery_orders` ADD `tracking_token_expires_at` timestamp NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_dispatch_events_tenant_order` ON `dispatch_delivery_events` (`tenant_id`,`order_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_dispatch_orders_tenant_created` ON `dispatch_delivery_orders` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_dispatch_stops_tenant_route` ON `dispatch_delivery_route_stops` (`tenant_id`,`route_id`);--> statement-breakpoint
CREATE INDEX `idx_dispatch_routes_tenant_date` ON `dispatch_delivery_routes` (`tenant_id`,`date`,`status`);--> statement-breakpoint
CREATE INDEX `idx_dispatch_techs_tenant_status` ON `dispatch_technicians` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_dispatch_orders_tracking_token` ON `dispatch_delivery_orders` (`tracking_token_hash`);--> statement-breakpoint
ALTER TABLE `dispatch_delivery_orders` DROP COLUMN `tracking_token`;