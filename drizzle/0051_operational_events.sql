CREATE TABLE `operational_events` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `event_type` varchar(80) NOT NULL,
  `event_domain` varchar(40) NOT NULL,
  `entity_id` varchar(120) NULL,
  `customer_id` varchar(120) NULL,
  `session_id` varchar(120) NULL,
  `attribution_id` varchar(120) NULL,
  `payload` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_operational_events` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_op_events_tenant_domain_time` ON `operational_events` (`tenant_id`, `event_domain`, `created_at`);
CREATE INDEX `idx_op_events_tenant_type_time` ON `operational_events` (`tenant_id`, `event_type`, `created_at`);
CREATE INDEX `idx_op_events_tenant_customer_time` ON `operational_events` (`tenant_id`, `customer_id`, `created_at`);
