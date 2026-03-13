CREATE TABLE `carrier_policies` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`carrier_name` varchar(60) NOT NULL,
	`origin_city` varchar(80),
	`origin_state` varchar(2),
	`cubage_factor` decimal(8,2) NOT NULL DEFAULT '300',
	`weight_threshold_excess` decimal(8,2),
	`delivery_time_days_base` int NOT NULL DEFAULT 7,
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carrier_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carrier_priority_rules` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`region_group` varchar(40) NOT NULL,
	`carrier_name` varchar(60) NOT NULL,
	`priority_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carrier_priority_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carrier_rate_rows` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`carrier_name` varchar(60) NOT NULL,
	`zone_code` varchar(20) NOT NULL,
	`weight_band_max` decimal(10,2) NOT NULL,
	`base_price` decimal(10,2) NOT NULL,
	`excess_kg_price` decimal(10,4),
	`adv_percent` decimal(6,4),
	`adv_min` decimal(10,2),
	`gris_percent` decimal(6,4),
	`gris_min` decimal(10,2),
	`tas_value` decimal(10,2),
	`trt_percent` decimal(6,4),
	`trt_min` decimal(10,2),
	`pedagio_value` decimal(10,2),
	`pedagio_fraction_kg` decimal(10,2),
	`emex_value` decimal(10,2),
	`emex_percent` decimal(6,4),
	`txa_value` decimal(10,2),
	`fpk_value` decimal(10,2),
	`fv_percent` decimal(6,4),
	`delivery_time_days` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `carrier_rate_rows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carrier_zones` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`carrier_name` varchar(60) NOT NULL,
	`zone_code` varchar(20) NOT NULL,
	`region_name` varchar(80),
	`capital_or_interior` varchar(10),
	`state` varchar(2),
	`cep_range_start` varchar(8),
	`cep_range_end` varchar(8),
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `carrier_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_assignments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`assigned_to` varchar(36) NOT NULL,
	`assigned_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `conversation_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`direction` varchar(20) NOT NULL,
	`source` varchar(30) NOT NULL,
	`message` text NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `conversation_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`organization_id` varchar(36),
	`phone_hash` varchar(64) NOT NULL,
	`phone_encrypted` varchar(255) NOT NULL,
	`channel` varchar(20) NOT NULL DEFAULT 'WHATSAPP',
	`status` varchar(30) NOT NULL DEFAULT 'OPEN',
	`stage` enum('NEW','QUALIFYING','QUOTED','NEGOTIATING','WON','LOST') NOT NULL DEFAULT 'NEW',
	`assigned_to` varchar(36),
	`last_message_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`segment` varchar(50),
	`status` varchar(50) NOT NULL DEFAULT 'ativo',
	`owner_id` varchar(36),
	`activity_bucket` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_customers_tenant_org` UNIQUE(`tenant_id`,`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `entity_custom_values` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`entity` varchar(50) NOT NULL,
	`entity_id` varchar(64) NOT NULL,
	`field_key` varchar(100) NOT NULL,
	`value` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entity_custom_values_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_entity_custom_values_unique` UNIQUE(`tenant_id`,`entity_id`,`field_key`)
);
--> statement-breakpoint
CREATE TABLE `frank_conversation_memory` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`session_id` varchar(128) NOT NULL,
	`role` varchar(20) NOT NULL,
	`message` text NOT NULL,
	`intent` varchar(50),
	`entities` json,
	`timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `frank_conversation_memory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `frank_intent_training` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`conversation_id` varchar(36),
	`message_id` varchar(36),
	`message_text` text NOT NULL,
	`detected_intent` varchar(255),
	`entities` json,
	`confidence` decimal(5,4),
	`status` varchar(50) NOT NULL DEFAULT 'captured',
	`playbook_id` varchar(36),
	`link_status` varchar(50) NOT NULL DEFAULT 'unlinked',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `frank_intent_training_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `frank_knowledge` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`tags` json,
	`source` varchar(50) NOT NULL DEFAULT 'manual',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `frank_knowledge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `frank_playbooks` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`intent` varchar(50) NOT NULL,
	`trigger_phrases` json,
	`related_entities` json,
	`response_base` text NOT NULL,
	`response_short` text,
	`next_step_suggestion` text,
	`requires_confirmation` boolean NOT NULL DEFAULT false,
	`requires_human_handoff` boolean NOT NULL DEFAULT false,
	`handoff_conditions` text,
	`tags` json,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`priority` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `frank_playbooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `frank_session_state` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`session_id` varchar(128) NOT NULL,
	`customer_id` varchar(36),
	`organization_id` varchar(36),
	`current_intent` varchar(50),
	`current_step` varchar(50),
	`last_simulation_id` varchar(36),
	`last_order_id` varchar(36),
	`last_referenced_shipment_id` varchar(36),
	`last_referenced_quote_id` varchar(36),
	`last_referenced_customer_id` varchar(36),
	`last_tool_used` varchar(60),
	`context_json` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `frank_session_state_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_frank_session_tenant_session` UNIQUE(`tenant_id`,`session_id`)
);
--> statement-breakpoint
CREATE TABLE `frank_suggestions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`session_id` varchar(128) NOT NULL,
	`intent` varchar(255),
	`entities` json,
	`playbook_id` varchar(36),
	`suggested_response` text NOT NULL,
	`confidence` decimal(5,4),
	`status` varchar(50) NOT NULL DEFAULT 'generated',
	`approved_by` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`approved_at` timestamp,
	CONSTRAINT `frank_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `freight_confirmations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`simulation_id` varchar(36),
	`order_id` varchar(36),
	`cep` varchar(10) NOT NULL,
	`cep_prefix` varchar(5) NOT NULL,
	`zone_code` varchar(30),
	`carrier_name` varchar(60) NOT NULL,
	`product_hash` varchar(64),
	`product_family` json,
	`total_weight` decimal(10,2) NOT NULL,
	`charged_weight` decimal(10,2) NOT NULL,
	`total_volumes` int NOT NULL DEFAULT 1,
	`quoted_freight` decimal(10,2),
	`confirmed_freight` decimal(10,2),
	`delta_value` decimal(10,2),
	`confirmation_source` varchar(30),
	`status` varchar(20) NOT NULL DEFAULT 'SIMULATED',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `freight_confirmations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `freight_memory` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`cep_prefix` varchar(5) NOT NULL,
	`zone_code` varchar(30),
	`carrier_name` varchar(60) NOT NULL,
	`product_family` varchar(60),
	`weight_band` varchar(30),
	`volume_band` varchar(30),
	`avg_confirmed_freight` decimal(10,2),
	`avg_delta` decimal(10,2),
	`confirmations_count` int NOT NULL DEFAULT 0,
	`confidence_score` varchar(10) NOT NULL DEFAULT 'low',
	`last_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `freight_memory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `freight_operational_settings` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`setting_key` varchar(100) NOT NULL,
	`setting_value` varchar(500) NOT NULL,
	`description` varchar(250),
	`category` varchar(50) NOT NULL DEFAULT 'packing',
	`rule_version` int NOT NULL DEFAULT 1,
	`active_from` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`active_to` timestamp,
	`is_active` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `freight_operational_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `freight_shipments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`simulation_id` varchar(36),
	`order_id` varchar(36),
	`carrier` varchar(60) NOT NULL,
	`service` varchar(60) NOT NULL,
	`tracking_code` varchar(60),
	`shipment_price` decimal(10,2),
	`status` varchar(30) NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `freight_shipments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `freight_simulations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`cep` varchar(10) NOT NULL,
	`cep_prefix` varchar(5) NOT NULL,
	`zone_code` varchar(30),
	`carrier_considered` json,
	`carrier_selected` varchar(60),
	`product_hash` varchar(64),
	`product_refs` json,
	`product_family` json,
	`total_weight` decimal(10,2) NOT NULL,
	`cubed_weight` decimal(10,2),
	`charged_weight` decimal(10,2) NOT NULL,
	`total_volumes` int NOT NULL DEFAULT 1,
	`volume_details` json,
	`dimension_source` varchar(30),
	`packing_rule_version` int,
	`quoted_freight` decimal(10,2),
	`breakdown_json` json,
	`strategy_used` varchar(30),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `freight_simulations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `idempotency_requests` (
	`id` varchar(36) NOT NULL,
	`idempotency_key` varchar(120) NOT NULL,
	`route` varchar(255) NOT NULL,
	`tenant_id` varchar(120),
	`response_status` int,
	`response_body` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `idempotency_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_idem_key_route` UNIQUE(`idempotency_key`,`route`)
);
--> statement-breakpoint
CREATE TABLE `incoming_messages` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`session_id` varchar(128) NOT NULL,
	`message` text NOT NULL,
	`phone` varchar(30),
	`twilio_payload` json,
	`timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`processed` boolean NOT NULL DEFAULT false,
	`processed_at` timestamp,
	CONSTRAINT `incoming_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operational_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`event_type` varchar(80) NOT NULL,
	`event_domain` varchar(40) NOT NULL,
	`entity_id` varchar(120),
	`customer_id` varchar(120),
	`session_id` varchar(120),
	`attribution_id` varchar(120),
	`payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `operational_events_id` PRIMARY KEY(`id`)
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`organization_id` varchar(36),
	`conversation_id` varchar(36),
	`quote_id` varchar(36),
	`status` varchar(50) NOT NULL DEFAULT 'CREATED',
	`priority` varchar(50) NOT NULL DEFAULT 'media',
	`channel` varchar(50),
	`carrier` varchar(100),
	`service` varchar(100),
	`total_amount` decimal(12,2),
	`price` decimal(10,2),
	`delivery_deadline` int,
	`created_by` varchar(36),
	`owner_id` varchar(36),
	`freight_simulation_id` varchar(36),
	`freight_confirmation_id` varchar(36),
	`logistics_status` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packing_profiles` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`product_ref` varchar(128),
	`profile_name` varchar(255) NOT NULL,
	`base_height` decimal(10,2) NOT NULL DEFAULT '0',
	`base_width` decimal(10,2) NOT NULL DEFAULT '0',
	`base_length` decimal(10,2) NOT NULL DEFAULT '0',
	`base_weight` decimal(10,3) NOT NULL DEFAULT '0',
	`packing_mode` varchar(20) NOT NULL DEFAULT 'SINGLE_FIXED',
	`stackable` boolean NOT NULL DEFAULT false,
	`nestable` boolean NOT NULL DEFAULT false,
	`requires_own_box` boolean NOT NULL DEFAULT false,
	`height_increment_per_extra_unit` decimal(10,2) NOT NULL DEFAULT '0',
	`width_increment_per_extra_unit` decimal(10,2) NOT NULL DEFAULT '0',
	`length_increment_per_extra_unit` decimal(10,2) NOT NULL DEFAULT '0',
	`max_units_per_volume` int NOT NULL DEFAULT 1,
	`review_status` varchar(20) NOT NULL DEFAULT 'DRAFT',
	`is_active` boolean NOT NULL DEFAULT false,
	`source` varchar(20) NOT NULL DEFAULT 'MANUAL',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `packing_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_edge_events` (
	`id` varchar(36) NOT NULL,
	`request_id` varchar(64) NOT NULL,
	`route` varchar(255) NOT NULL,
	`reason` varchar(100) NOT NULL,
	`ip_hash` varchar(64),
	`tenant_claim` varchar(36),
	`user_claim` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `security_edge_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `supreme_actions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`action_type` varchar(80) NOT NULL,
	`action_scope` varchar(40) NOT NULL,
	`status` varchar(40) NOT NULL DEFAULT 'PROPOSED',
	`proposed_by` varchar(40) NOT NULL,
	`approved_by` varchar(120),
	`executed_by` varchar(40),
	`payload` json NOT NULL,
	`result` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`approved_at` timestamp,
	`executed_at` timestamp,
	CONSTRAINT `supreme_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supreme_benchmarks` (
	`id` varchar(36) NOT NULL,
	`benchmark_domain` varchar(40) NOT NULL,
	`benchmark_metric` varchar(80) NOT NULL,
	`segment_key` varchar(120) NOT NULL,
	`sample_size` int NOT NULL,
	`p25` double,
	`p50` double,
	`p75` double,
	`computed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `supreme_benchmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supreme_findings` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`finding_type` varchar(80) NOT NULL,
	`finding_domain` varchar(40) NOT NULL,
	`severity` varchar(20) NOT NULL,
	`title` varchar(160) NOT NULL,
	`summary` text NOT NULL,
	`evidence` json NOT NULL,
	`recommended_action_type` varchar(80),
	`recommended_action_payload` json,
	`status` varchar(40) NOT NULL DEFAULT 'OPEN',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`resolved_at` timestamp,
	CONSTRAINT `supreme_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supreme_playbooks` (
	`id` varchar(36) NOT NULL,
	`playbook_name` varchar(120) NOT NULL,
	`playbook_domain` varchar(40) NOT NULL,
	`trigger_finding_type` varchar(80) NOT NULL,
	`action_sequence` json NOT NULL,
	`expected_metric` varchar(80) NOT NULL,
	`success_threshold` double NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supreme_playbooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_configurations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` json NOT NULL,
	`category` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`created_by` varchar(255),
	CONSTRAINT `tenant_configurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_tenant_config_key` UNIQUE(`tenant_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `tenant_custom_fields` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`entity` varchar(50) NOT NULL,
	`field_key` varchar(100) NOT NULL,
	`label` varchar(255) NOT NULL,
	`type` varchar(30) NOT NULL,
	`required` boolean NOT NULL DEFAULT false,
	`options` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_custom_fields_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_tenant_custom_fields_key_unique` UNIQUE(`tenant_id`,`entity`,`field_key`)
);
--> statement-breakpoint
CREATE TABLE `tenant_data_contract_status` (
	`tenant_id` varchar(36) NOT NULL,
	`acquisition_ready` boolean NOT NULL DEFAULT false,
	`conversion_ready` boolean NOT NULL DEFAULT false,
	`revenue_ready` boolean NOT NULL DEFAULT false,
	`retention_ready` boolean NOT NULL DEFAULT false,
	`operational_ready` boolean NOT NULL DEFAULT false,
	`last_checked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_data_contract_status_tenant_id` PRIMARY KEY(`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_playbooks` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`entity` varchar(50) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`steps` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`created_by` varchar(36),
	CONSTRAINT `tenant_playbooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_supreme_permissions` (
	`tenant_id` varchar(36) NOT NULL,
	`allow_read_metrics` boolean NOT NULL DEFAULT true,
	`allow_generate_recommendations` boolean NOT NULL DEFAULT true,
	`allow_execute_optimizations` boolean NOT NULL DEFAULT false,
	`allow_ads_budget_changes` boolean NOT NULL DEFAULT false,
	`allow_crm_actions` boolean NOT NULL DEFAULT false,
	`allow_whatsapp_automation` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_supreme_permissions_tenant_id` PRIMARY KEY(`tenant_id`)
);
--> statement-breakpoint
ALTER TABLE `webhook_events` DROP INDEX `idx_webhook_events_provider_external`;--> statement-breakpoint
ALTER TABLE `admin_audit_log` MODIFY COLUMN `tenant_id` varchar(36);--> statement-breakpoint
ALTER TABLE `admin_audit_log` MODIFY COLUMN `user_id` varchar(36);--> statement-breakpoint
ALTER TABLE `admin_audit_log` ADD `actor_type` varchar(20) DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_audit_log` ADD `scope` varchar(64);--> statement-breakpoint
ALTER TABLE `admin_audit_log` ADD `request_id` varchar(64);--> statement-breakpoint
ALTER TABLE `admin_audit_log` ADD `payload_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `simulations` ADD `customer_id` varchar(36);--> statement-breakpoint
ALTER TABLE `simulations` ADD `organization_id` varchar(36);--> statement-breakpoint
ALTER TABLE `simulations` ADD `conversation_id` varchar(36);--> statement-breakpoint
ALTER TABLE `simulations` ADD `created_by` varchar(36);--> statement-breakpoint
ALTER TABLE `simulations` ADD `source` varchar(30) DEFAULT 'API' NOT NULL;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD `event_id` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD `event_type` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD CONSTRAINT `idx_webhook_events_provider_event` UNIQUE(`provider`,`event_id`);--> statement-breakpoint
CREATE INDEX `idx_carrier_policies_tenant_carrier` ON `carrier_policies` (`tenant_id`,`carrier_name`);--> statement-breakpoint
CREATE INDEX `idx_carrier_priority_tenant_region` ON `carrier_priority_rules` (`tenant_id`,`region_group`);--> statement-breakpoint
CREATE INDEX `idx_carrier_rate_rows_tenant_carrier_zone` ON `carrier_rate_rows` (`tenant_id`,`carrier_name`,`zone_code`);--> statement-breakpoint
CREATE INDEX `idx_carrier_rate_rows_lookup` ON `carrier_rate_rows` (`tenant_id`,`carrier_name`,`zone_code`,`weight_band_max`);--> statement-breakpoint
CREATE INDEX `idx_carrier_zones_tenant_carrier_zone` ON `carrier_zones` (`tenant_id`,`carrier_name`,`zone_code`);--> statement-breakpoint
CREATE INDEX `idx_carrier_zones_tenant_carrier_state` ON `carrier_zones` (`tenant_id`,`carrier_name`,`state`);--> statement-breakpoint
CREATE INDEX `idx_conversation_assign_conv` ON `conversation_assignments` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_conversation_msgs_conv_created` ON `conversation_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_conversations_tenant_phone` ON `conversations` (`tenant_id`,`phone_hash`);--> statement-breakpoint
CREATE INDEX `idx_conversations_tenant_status` ON `conversations` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_customer_contacts_tenant_customer` ON `customer_contacts` (`tenant_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_entity_custom_values_id` ON `entity_custom_values` (`tenant_id`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_frank_memory_tenant_session` ON `frank_conversation_memory` (`tenant_id`,`session_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_frank_intents_tenant_status` ON `frank_intent_training` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_frank_intents_created_at` ON `frank_intent_training` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_knowledge_tenant_created` ON `frank_knowledge` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_playbooks_tenant_intent_status` ON `frank_playbooks` (`tenant_id`,`intent`,`status`);--> statement-breakpoint
CREATE INDEX `idx_frank_session_updated` ON `frank_session_state` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_suggestions_tenant_session` ON `frank_suggestions` (`tenant_id`,`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_suggestions_tenant_conversation` ON `frank_suggestions` (`tenant_id`,`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_freight_conf_tenant_status` ON `freight_confirmations` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_freight_conf_simulation` ON `freight_confirmations` (`simulation_id`);--> statement-breakpoint
CREATE INDEX `idx_freight_mem_tenant_carrier_zone` ON `freight_memory` (`tenant_id`,`carrier_name`,`zone_code`);--> statement-breakpoint
CREATE INDEX `idx_freight_mem_tenant_cep` ON `freight_memory` (`tenant_id`,`cep_prefix`);--> statement-breakpoint
CREATE INDEX `idx_freight_ops_settings_tenant_key` ON `freight_operational_settings` (`tenant_id`,`setting_key`);--> statement-breakpoint
CREATE INDEX `idx_freight_shipments_tenant_sim` ON `freight_shipments` (`tenant_id`,`simulation_id`);--> statement-breakpoint
CREATE INDEX `idx_freight_shipments_tenant_order` ON `freight_shipments` (`tenant_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `idx_freight_shipments_tracking` ON `freight_shipments` (`tracking_code`);--> statement-breakpoint
CREATE INDEX `idx_freight_sim_tenant_cep` ON `freight_simulations` (`tenant_id`,`cep_prefix`);--> statement-breakpoint
CREATE INDEX `idx_freight_sim_tenant_created` ON `freight_simulations` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_incoming_messages_unprocessed` ON `incoming_messages` (`processed`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_op_events_tenant_domain_time` ON `operational_events` (`tenant_id`,`event_domain`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_op_events_tenant_type_time` ON `operational_events` (`tenant_id`,`event_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_op_events_tenant_customer_time` ON `operational_events` (`tenant_id`,`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_order_items_tenant_order` ON `order_items` (`tenant_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_status_history_tenant_order` ON `order_status_history` (`tenant_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_customer` ON `orders` (`tenant_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_status` ON `orders` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_packing_profiles_tenant_id` ON `packing_profiles` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_packing_profiles_tenant_review` ON `packing_profiles` (`tenant_id`,`review_status`);--> statement-breakpoint
CREATE INDEX `idx_packing_profiles_tenant_active` ON `packing_profiles` (`tenant_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_sec_edge_events_created_at_route` ON `security_edge_events` (`created_at`,`route`);--> statement-breakpoint
CREATE INDEX `idx_sec_edge_events_tenant` ON `security_edge_events` (`tenant_claim`);--> statement-breakpoint
CREATE INDEX `idx_shipments_tenant_order` ON `shipments` (`tenant_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `idx_sa_tenant_status_time` ON `supreme_actions` (`tenant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sa_tenant_type_time` ON `supreme_actions` (`tenant_id`,`action_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sb_domain_metric_segment` ON `supreme_benchmarks` (`benchmark_domain`,`benchmark_metric`,`segment_key`);--> statement-breakpoint
CREATE INDEX `idx_sb_computed_at` ON `supreme_benchmarks` (`computed_at`);--> statement-breakpoint
CREATE INDEX `idx_sf_tenant_status_time` ON `supreme_findings` (`tenant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sf_tenant_domain_time` ON `supreme_findings` (`tenant_id`,`finding_domain`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sf_tenant_severity_time` ON `supreme_findings` (`tenant_id`,`severity`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sp_domain` ON `supreme_playbooks` (`playbook_domain`);--> statement-breakpoint
CREATE INDEX `idx_sp_trigger` ON `supreme_playbooks` (`trigger_finding_type`);--> statement-breakpoint
CREATE INDEX `idx_tenant_config_category` ON `tenant_configurations` (`tenant_id`,`category`);--> statement-breakpoint
CREATE INDEX `idx_tenant_custom_fields_entity` ON `tenant_custom_fields` (`tenant_id`,`entity`);--> statement-breakpoint
CREATE INDEX `idx_tenant_playbooks_entity` ON `tenant_playbooks` (`tenant_id`,`entity`);--> statement-breakpoint
ALTER TABLE `webhook_events` DROP COLUMN `external_id`;