CREATE TABLE `tenant_supreme_permissions` (
  `tenant_id` varchar(36) NOT NULL,
  `allow_read_metrics` boolean NOT NULL DEFAULT true,
  `allow_generate_recommendations` boolean NOT NULL DEFAULT true,
  `allow_execute_optimizations` boolean NOT NULL DEFAULT false,
  `allow_ads_budget_changes` boolean NOT NULL DEFAULT false,
  `allow_crm_actions` boolean NOT NULL DEFAULT false,
  `allow_whatsapp_automation` boolean NOT NULL DEFAULT true,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pk_tenant_supreme_permissions` PRIMARY KEY(`tenant_id`)
);
