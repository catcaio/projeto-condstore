CREATE INDEX `idx_crm_notes_tenant_conversation` ON `crm_notes` (`tenant_id`,`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_notes_tenant_created_at` ON `crm_notes` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_crm_opp_tenant_status` ON `crm_opportunities` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_crm_opp_tenant_created_at` ON `crm_opportunities` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_crm_quotes_tenant_status` ON `crm_quotes` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_crm_quotes_tenant_created_at` ON `crm_quotes` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_crm_tasks_tenant_status` ON `crm_tasks` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_crm_tasks_tenant_conversation` ON `crm_tasks` (`tenant_id`,`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_tasks_tenant_created_at` ON `crm_tasks` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_freight_shipments_tenant_created_at` ON `freight_shipments` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_freight_shipments_tenant_status` ON `freight_shipments` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_op_events_tenant_time` ON `operational_events` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_created_at` ON `orders` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_conversation` ON `orders` (`tenant_id`,`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_shipments_tenant_created_at` ON `shipments` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_shipments_tenant_status` ON `shipments` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_simulations_tenant_status` ON `simulations` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_simulations_tenant_customer` ON `simulations` (`tenant_id`,`customer_id`);