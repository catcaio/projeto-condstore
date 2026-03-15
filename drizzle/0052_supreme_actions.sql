CREATE TABLE `supreme_actions` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `action_type` varchar(80) NOT NULL,
  `action_scope` varchar(40) NOT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'PROPOSED',
  `proposed_by` varchar(40) NOT NULL,
  `approved_by` varchar(120) NULL,
  `executed_by` varchar(40) NULL,
  `payload` json NOT NULL,
  `result` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL,
  `executed_at` timestamp NULL,
  CONSTRAINT `pk_supreme_actions` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sa_tenant_status_time` ON `supreme_actions` (`tenant_id`, `status`, `created_at`);--> statement-breakpoint
CREATE INDEX `idx_sa_tenant_type_time` ON `supreme_actions` (`tenant_id`, `action_type`, `created_at`);
