CREATE TABLE `tenant_data_contract_status` (
  `tenant_id` varchar(36) NOT NULL,
  `acquisition_ready` boolean NOT NULL DEFAULT false,
  `conversion_ready` boolean NOT NULL DEFAULT false,
  `revenue_ready` boolean NOT NULL DEFAULT false,
  `retention_ready` boolean NOT NULL DEFAULT false,
  `operational_ready` boolean NOT NULL DEFAULT false,
  `last_checked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_tenant_data_contract_status` PRIMARY KEY(`tenant_id`)
);
