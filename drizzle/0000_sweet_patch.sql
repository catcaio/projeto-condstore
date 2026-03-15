CREATE TABLE `admin_audit_log` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`user_id` varchar(36),
	`actor_type` varchar(20) NOT NULL DEFAULT 'user',
	`action` varchar(64) NOT NULL,
	`scope` varchar(64),
	`request_id` varchar(64),
	`payload_hash` varchar(64),
	`metadata` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `admin_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_decision_logs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`message_id` varchar(64) NOT NULL,
	`provider_event_id` varchar(64),
	`provider` varchar(30) NOT NULL,
	`model` varchar(255) NOT NULL,
	`intent` varchar(50) NOT NULL,
	`confidence` decimal(5,4),
	`tool_used` varchar(100),
	`tool_payload` text,
	`tokens_in` int,
	`tokens_out` int,
	`latency_ms` int,
	`response_type` varchar(30) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `ai_decision_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_eval_runs` (
	`id` varchar(36) NOT NULL,
	`prompt_id` varchar(128) NOT NULL,
	`prompt_version` varchar(50) NOT NULL,
	`model` varchar(100) NOT NULL,
	`score` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`report_json` json NOT NULL,
	CONSTRAINT `ai_eval_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_prompts` (
	`id` varchar(128) NOT NULL,
	`version` varchar(50) NOT NULL,
	`system` text NOT NULL,
	`temperature` decimal(3,2) NOT NULL DEFAULT '0.7',
	`max_tokens` int NOT NULL DEFAULT 1000,
	`active` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `pk_ai_prompts_id_version` PRIMARY KEY(`id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `attribution_clicks` (
	`id` varchar(36) NOT NULL,
	`token` varchar(128) NOT NULL,
	`tenant_id` varchar(36),
	`utm_source` varchar(255),
	`utm_medium` varchar(255),
	`utm_campaign` varchar(255),
	`utm_term` varchar(255),
	`utm_content` varchar(255),
	`click_id` varchar(255),
	`landing_url` varchar(2048),
	`user_agent_hash` varchar(64),
	`ip_hash` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`consumed_at` timestamp,
	CONSTRAINT `attribution_clicks_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_attribution_clicks_token` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `billing_ledger` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(32) NOT NULL,
	`amount_usd` decimal(12,6),
	`metadata` json,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `billing_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `customer_accounts` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`role` varchar(50) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_accounts_id` PRIMARY KEY(`id`)
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
CREATE TABLE `customer_timeline_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(128) NOT NULL,
	`status` varchar(100) NOT NULL,
	`message_public` text NOT NULL,
	`metadata_json` json,
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_timeline_events_id` PRIMARY KEY(`id`)
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
CREATE TABLE `delivery_proofs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`shipment_id` varchar(128) NOT NULL,
	`photo_url` text,
	`receiver_name` varchar(255),
	`signed_at` timestamp,
	`geo_hash` varchar(64),
	`metadata_json` json,
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `delivery_proofs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `domine_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`source` varchar(50) NOT NULL,
	`type` varchar(128) NOT NULL,
	`idempotency_key` varchar(255) NOT NULL,
	`payload_json` json,
	`processed_at` timestamp,
	`status` varchar(30) NOT NULL DEFAULT 'queued',
	`retry_count` int NOT NULL DEFAULT 0,
	`next_retry_at` timestamp,
	`error_code` varchar(100),
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domine_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_domine_events_tenant_idempotency` UNIQUE(`tenant_id`,`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `domine_events_dlq` (
	`id` varchar(36) NOT NULL,
	`event_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`event_type` varchar(128) NOT NULL,
	`payload_json` json,
	`failure_reason` text NOT NULL,
	`retry_count` int NOT NULL DEFAULT 0,
	`failed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domine_events_dlq_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `domine_freight_quotes` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`correlation_id` varchar(100) NOT NULL,
	`request_id` varchar(100),
	`source` varchar(50) NOT NULL,
	`origin_zip` varchar(20),
	`dest_zip` varchar(20),
	`weight` int,
	`dims` varchar(100),
	`quotes_json_redacted` json,
	`best_carrier` varchar(100),
	`best_price_cents` int,
	`best_eta_days` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domine_freight_quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_domine_freight_quotes_correlation` UNIQUE(`tenant_id`,`correlation_id`)
);
--> statement-breakpoint
CREATE TABLE `domine_intake_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`source` varchar(50) NOT NULL,
	`event_type` varchar(128) NOT NULL,
	`external_id` varchar(128) NOT NULL,
	`occurred_at` timestamp NOT NULL,
	`received_at` timestamp NOT NULL DEFAULT (now()),
	`payload_redacted` json,
	`status` varchar(30) NOT NULL DEFAULT 'queued',
	`rejection_reason` text,
	CONSTRAINT `domine_intake_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_domine_intake_events_idempotency` UNIQUE(`tenant_id`,`source`,`event_type`,`external_id`)
);
--> statement-breakpoint
CREATE TABLE `domine_orders` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`order_id` varchar(100) NOT NULL,
	`status` varchar(50) NOT NULL,
	`totals` json,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `domine_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_domine_orders_tenant_order` UNIQUE(`tenant_id`,`order_id`)
);
--> statement-breakpoint
CREATE TABLE `domine_tenant_intake_configs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`tenant_key` varchar(128) NOT NULL,
	`secret` varchar(255),
	`allow_unsigned_intake` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `domine_tenant_intake_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_domine_tenant_intake_configs_key` UNIQUE(`tenant_key`)
);
--> statement-breakpoint
CREATE TABLE `end_user_consents` (
	`tenant_id` varchar(36) NOT NULL,
	`phone_hash` varchar(64) NOT NULL,
	`consent_given` boolean NOT NULL DEFAULT false,
	`consent_timestamp` timestamp,
	`consent_source` varchar(50),
	`blocked_attempts` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pk_end_user_consents` PRIMARY KEY(`tenant_id`,`phone_hash`)
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
CREATE TABLE `finops_alert_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`prev_state` varchar(50) NOT NULL,
	`next_state` varchar(50) NOT NULL,
	`reason` varchar(100) NOT NULL,
	`projected_days_to_hard_limit` decimal(10,2),
	`current_month_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`monthly_budget_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`burn_rate_per_day` decimal(12,6),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `finops_alert_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finops_lock_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`locked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`current_month_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`monthly_budget_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`burn_rate_per_day` decimal(12,6),
	`resolved_at` timestamp,
	`resolution_type` varchar(50),
	CONSTRAINT `finops_lock_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finops_monthly_resets` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`reset_month` varchar(10) NOT NULL,
	`prev_current_month_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`prev_burn_rate_per_day` decimal(12,6),
	`performed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `finops_monthly_resets_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_finops_monthly_resets_tenant_month` UNIQUE(`tenant_id`,`reset_month`)
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
CREATE TABLE `frank_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(100) NOT NULL,
	`session_id` varchar(100),
	`correlation_id` varchar(100),
	`kind` varchar(50) NOT NULL,
	`payload_json` json NOT NULL,
	`provider` varchar(50) NOT NULL,
	`model` varchar(100) NOT NULL,
	`latency_ms` int NOT NULL,
	`tokens_prompt` int NOT NULL DEFAULT 0,
	`tokens_completion` int NOT NULL DEFAULT 0,
	`rag_used` int NOT NULL DEFAULT 0,
	`rag_chunks` int NOT NULL DEFAULT 0,
	`rag_latency_ms` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `frank_events_id` PRIMARY KEY(`id`)
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
CREATE TABLE `frank_rollout_decisions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(100) NOT NULL,
	`baseline` varchar(50) NOT NULL,
	`candidate` varchar(50) NOT NULL,
	`decision` varchar(30) NOT NULL,
	`applied` int NOT NULL DEFAULT 0,
	`dry_run` int NOT NULL DEFAULT 1,
	`reasons_json` json,
	`metrics_json` json,
	`request_id` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `frank_rollout_decisions_id` PRIMARY KEY(`id`)
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
CREATE TABLE `freight_funnel_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`phone_number` varchar(30) NOT NULL,
	`phone_hash` varchar(64),
	`phone_encrypted` text,
	`session_id` varchar(36) NOT NULL,
	`stage` varchar(50) NOT NULL,
	`utm_source` varchar(255),
	`utm_medium` varchar(255),
	`utm_campaign` varchar(255),
	`utm_term` varchar(255),
	`utm_content` varchar(255),
	`ref_token` varchar(128),
	`click_id` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `freight_funnel_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_funnel_unique_stage` UNIQUE(`session_id`,`stage`)
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
CREATE TABLE `freight_simulation_logs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(100) NOT NULL,
	`uf` varchar(2) NOT NULL,
	`peso` decimal(10,2) NOT NULL,
	`valor` decimal(10,2) NOT NULL,
	`prazo` int NOT NULL,
	`cep_hash` varchar(64) NOT NULL,
	`utm_source` varchar(255),
	`utm_medium` varchar(255),
	`utm_campaign` varchar(255),
	`utm_term` varchar(255),
	`utm_content` varchar(255),
	`ref_token` varchar(128),
	`click_id` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `freight_simulation_logs_id` PRIMARY KEY(`id`)
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
CREATE TABLE `inbound_message_dedup` (
	`message_sid` varchar(64) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inbound_message_dedup_message_sid` PRIMARY KEY(`message_sid`)
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
CREATE TABLE `invites` (
	`id` varchar(36) NOT NULL,
	`token` varchar(128) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`role` varchar(20) NOT NULL,
	`email` varchar(255),
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`order_id` varchar(128),
	`amount_cents` int NOT NULL,
	`due_date` timestamp NOT NULL,
	`status` varchar(50) NOT NULL,
	`boleto_url` text,
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`message_sid` varchar(64) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`from_phone` varchar(30) NOT NULL,
	`phone_hash` varchar(64),
	`phone_encrypted` text,
	`to_phone` varchar(30),
	`body` text NOT NULL,
	`body_encrypted` text,
	`direction` varchar(10) NOT NULL DEFAULT 'inbound',
	`intent` varchar(50) NOT NULL DEFAULT 'unknown',
	`intent_confidence` decimal(5,4),
	`raw_payload` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `messages_message_sid` PRIMARY KEY(`message_sid`)
);
--> statement-breakpoint
CREATE TABLE `metrics_daily` (
	`tenant_id` varchar(36) NOT NULL,
	`day_date` date NOT NULL,
	`utm_source` varchar(255) NOT NULL DEFAULT '(none)',
	`utm_campaign` varchar(255) NOT NULL DEFAULT '(none)',
	`total_events` int NOT NULL DEFAULT 0,
	`funnel_started` int NOT NULL DEFAULT 0,
	`freight_simulations` int NOT NULL DEFAULT 0,
	`consumed_tokens` int NOT NULL DEFAULT 0,
	`click_tokens` int NOT NULL DEFAULT 0,
	CONSTRAINT `pk_metrics_daily` PRIMARY KEY(`tenant_id`,`day_date`,`utm_source`,`utm_campaign`)
);
--> statement-breakpoint
CREATE TABLE `metrics_rollup_status` (
	`tenant_id` varchar(36) NOT NULL,
	`last_day_processed` date,
	`last_run_at` datetime,
	`last_duration_ms` int,
	`last_rows_written` int,
	`status` enum('ok','error') NOT NULL DEFAULT 'ok',
	`last_error_code` varchar(64),
	CONSTRAINT `metrics_rollup_status_tenant_id` PRIMARY KEY(`tenant_id`)
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
CREATE TABLE `organizations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`legal_name` varchar(255) NOT NULL,
	`trade_name` varchar(255),
	`cnpj_hash` varchar(64) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
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
CREATE TABLE `plans` (
	`id` varchar(36) NOT NULL,
	`name` varchar(64) NOT NULL,
	`monthly_price_usd` decimal(12,6) NOT NULL,
	`monthly_budget_usd` decimal(12,6) NOT NULL,
	`soft_limit_percent` int NOT NULL DEFAULT 80,
	`hard_limit_percent` int NOT NULL DEFAULT 100,
	`active` int NOT NULL DEFAULT 1,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_reports` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`module_key` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'done',
	`changes` text,
	`metrics` text,
	`risks` text,
	`next_actions` text,
	`tags` text,
	`source` varchar(20) NOT NULL DEFAULT 'manual',
	`content_hash` varchar(64) NOT NULL,
	CONSTRAINT `project_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_report_hash` UNIQUE(`content_hash`)
);
--> statement-breakpoint
CREATE TABLE `public_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`anon_id` varchar(128) NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`attribution_id` varchar(36),
	`payload_json` json,
	`ip_hash` varchar(64),
	`ua_hash` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `public_events_id` PRIMARY KEY(`id`)
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
CREATE TABLE `security_incidents` (
	`id` varchar(36) NOT NULL,
	`reason` varchar(100) NOT NULL,
	`count` int NOT NULL,
	`route` varchar(255),
	`ip_hash` varchar(64),
	`window_start` timestamp NOT NULL,
	`window_end` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `security_incidents_id` PRIMARY KEY(`id`)
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
CREATE TABLE `simulations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`organization_id` varchar(36),
	`conversation_id` varchar(36),
	`created_by` varchar(36),
	`source` varchar(30) NOT NULL DEFAULT 'API',
	`cep` varchar(8) NOT NULL,
	`weight` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL,
	`product_cost` decimal(10,2),
	`selling_price` decimal(10,2),
	`best_carrier` varchar(100),
	`best_service` varchar(100),
	`best_price` decimal(10,2),
	`best_margin` decimal(10,2),
	`strategy` varchar(50),
	`idempotency_key` varchar(255),
	`event` varchar(50) NOT NULL DEFAULT 'FREIGHT_QUOTED',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `simulations_id` PRIMARY KEY(`id`),
	CONSTRAINT `simulations_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`address_redacted` text,
	`purge_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`id` varchar(128) NOT NULL,
	`stripe_event_id` varchar(128) NOT NULL,
	`received_at` timestamp NOT NULL,
	`type` varchar(128) NOT NULL,
	`stripe_created_at` timestamp,
	`payload_hash` varchar(64),
	CONSTRAINT `stripe_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_stripe_events_event_id` UNIQUE(`stripe_event_id`)
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
CREATE TABLE `tenant_ai_providers` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`provider_type` varchar(30) NOT NULL,
	`base_url` varchar(255) NOT NULL,
	`model` varchar(255) NOT NULL,
	`embed_model` varchar(255) NOT NULL,
	`api_key_encrypted` varchar(512),
	`is_enabled` int NOT NULL DEFAULT 1,
	`timeout_ms` int NOT NULL DEFAULT 20000,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_ai_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_budgets` (
	`tenant_id` varchar(36) NOT NULL,
	`monthly_token_limit` int NOT NULL DEFAULT 1000000,
	`tokens_consumed` int NOT NULL DEFAULT 0,
	`current_lock_state` varchar(20) NOT NULL DEFAULT 'unlocked',
	`state_revision` int NOT NULL DEFAULT 1,
	`monthly_budget_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`soft_limit_percent` int NOT NULL DEFAULT 80,
	`hard_limit_percent` int NOT NULL DEFAULT 100,
	`current_month_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`burn_rate_per_day` decimal(12,6),
	`last_budget_reset_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_budgets_tenant_id` PRIMARY KEY(`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_collections` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`source_type` varchar(32) NOT NULL DEFAULT 'manual',
	`connector_type` varchar(32),
	`auto_sync` boolean NOT NULL DEFAULT false,
	`last_sync_at` timestamp,
	`sync_status` varchar(32) NOT NULL DEFAULT 'idle',
	`connector_config` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_collections_id` PRIMARY KEY(`id`)
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
CREATE TABLE `tenant_document_chunks` (
	`id` varchar(36) NOT NULL,
	`version_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`page_number` int,
	`pii_risk_score` decimal(5,2) NOT NULL DEFAULT '0',
	`order_index` int NOT NULL,
	`char_start` int NOT NULL DEFAULT 0,
	`char_end` int NOT NULL DEFAULT 0,
	`embedding` json,
	`vector_embedding` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_document_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_document_tags` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`tag` varchar(128) NOT NULL,
	CONSTRAINT `tenant_document_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_document_versions` (
	`id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`object_key` varchar(512) NOT NULL,
	`mime_type` varchar(128) NOT NULL,
	`size_bytes` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`status` enum('uploaded','queued','processing','ready','ready_indexed','failed') NOT NULL DEFAULT 'uploaded',
	`extracted_text_preview` text,
	`extracted_meta_json` json,
	`error_code` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_document_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_tenant_docs_tenant_sha256` UNIQUE(`tenant_id`,`sha256`)
);
--> statement-breakpoint
CREATE TABLE `tenant_documents` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`collection_id` varchar(36),
	`is_sensitive` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`payload` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_incidents` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`started_at` timestamp NOT NULL,
	`ended_at` timestamp,
	`triggered_by` varchar(255) NOT NULL,
	`metadata` json,
	CONSTRAINT `tenant_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_ingestion_jobs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`version_id` varchar(36) NOT NULL,
	`status` enum('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_ingestion_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_knowledge_queries` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`question_hash` varchar(64) NOT NULL,
	`question_preview` varchar(200) NOT NULL,
	`confidence` decimal(5,4) NOT NULL,
	`citations_json` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`request_id` varchar(128),
	CONSTRAINT `tenant_knowledge_queries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_knowledge_sources` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenant_knowledge_sources_id` PRIMARY KEY(`id`)
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
CREATE TABLE `tenant_saved_views` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`module` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`filters_json` text NOT NULL,
	`created_by_user_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_saved_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_saved_views_tenant_module_name` UNIQUE(`tenant_id`,`module`,`name`)
);
--> statement-breakpoint
CREATE TABLE `tenant_secrets` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`scope` varchar(50) NOT NULL,
	`key_name` varchar(255) NOT NULL,
	`value_encrypted` text NOT NULL,
	`value_hash` varchar(64) NOT NULL,
	`last_rotated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`last_verified_at` timestamp,
	`rotated_by_user_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_secrets_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_tenant_secrets_scope_key` UNIQUE(`tenant_id`,`scope`,`key_name`)
);
--> statement-breakpoint
CREATE TABLE `tenant_signup_policies` (
	`tenant_id` varchar(36) NOT NULL,
	`self_signup_enabled` boolean NOT NULL DEFAULT false,
	`allowed_domains` json,
	`allowed_emails` json,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_signup_policies_tenant_id` PRIMARY KEY(`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_subscriptions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`plan_id` varchar(36) NOT NULL,
	`status` varchar(32) NOT NULL,
	`started_at` timestamp NOT NULL,
	`ended_at` timestamp,
	`stripe_customer_id` varchar(128),
	`stripe_subscription_id` varchar(128),
	`last_payment_failed_at` timestamp,
	`cancel_at_period_end` boolean NOT NULL DEFAULT false,
	`current_period_end` timestamp,
	CONSTRAINT `tenant_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_tenant_subscriptions_tenant` UNIQUE(`tenant_id`)
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
CREATE TABLE `tenant_usage_metrics` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`date` date NOT NULL,
	`total_requests` int NOT NULL DEFAULT 0,
	`total_tool_calls` int NOT NULL DEFAULT 0,
	`total_tokens_input` int NOT NULL DEFAULT 0,
	`total_tokens_output` int NOT NULL DEFAULT 0,
	`estimated_cost_usd` decimal(12,6) NOT NULL DEFAULT '0',
	`model_distribution_json` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_usage_metrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_tenant_usage_metrics_tenant_date` UNIQUE(`tenant_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`twilio_number` varchar(30) NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
	`stripe_customer_id` varchar(255),
	`stripe_subscription_id` varchar(255),
	`plan` varchar(50),
	`plan_status` varchar(50),
	`plan_current_period_end` timestamp,
	`outbound_enabled` boolean NOT NULL DEFAULT true,
	`incident_mode` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_twilio_number_unique` UNIQUE(`twilio_number`)
);
--> statement-breakpoint
CREATE TABLE `token_usage_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`trace_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`model_used` varchar(100) NOT NULL DEFAULT 'unknown',
	`input_tokens` int NOT NULL DEFAULT 0,
	`output_tokens` int NOT NULL DEFAULT 0,
	`estimated_cost_usd` decimal(10,6) NOT NULL DEFAULT '0',
	`processed_by_worker` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `token_usage_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_token_usage_events_trace_id` UNIQUE(`trace_id`)
);
--> statement-breakpoint
CREATE TABLE `user_consents_log` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`phone_hash` varchar(64) NOT NULL,
	`consent_given` boolean NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`ip_hash` varchar(64),
	`source` varchar(50),
	CONSTRAINT `user_consents_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_ui_prefs` (
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`key` varchar(100) NOT NULL,
	`payload_json` json NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_ui_prefs_tenant_id_user_id_key_pk` PRIMARY KEY(`tenant_id`,`user_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255),
	`password_hash` varchar(512),
	`auth_provider` varchar(20) NOT NULL DEFAULT 'email',
	`provider_id` varchar(255),
	`tenant_id` varchar(36) NOT NULL,
	`role` varchar(20) NOT NULL DEFAULT 'operator',
	`session_version` int NOT NULL DEFAULT 1,
	`email_verify_token` varchar(128),
	`email_verified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` varchar(36) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`event_id` varchar(128) NOT NULL,
	`event_type` varchar(128) NOT NULL,
	`received_at` timestamp NOT NULL,
	`payload_hash` varchar(128) NOT NULL,
	`processed_at` timestamp,
	`status` varchar(32) NOT NULL,
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_webhook_events_provider_event` UNIQUE(`provider`,`event_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_tenant_created_at` ON `admin_audit_log` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_user_created_at` ON `admin_audit_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_action_created_at` ON `admin_audit_log` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_decision_logs_tenant_created_at` ON `ai_decision_logs` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_eval_runs_prompt_id` ON `ai_eval_runs` (`prompt_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_eval_runs_created_at` ON `ai_eval_runs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_prompts_active` ON `ai_prompts` (`active`);--> statement-breakpoint
CREATE INDEX `idx_attribution_clicks_tenant_created_at` ON `attribution_clicks` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_attribution_clicks_consumed_at` ON `attribution_clicks` (`consumed_at`);--> statement-breakpoint
CREATE INDEX `idx_billing_ledger_tenant` ON `billing_ledger` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_billing_ledger_tenant_created` ON `billing_ledger` (`tenant_id`,`created_at`);--> statement-breakpoint
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
CREATE INDEX `idx_couriers_tenant` ON `couriers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_couriers_phone_hash` ON `couriers` (`phone_hash`);--> statement-breakpoint
CREATE INDEX `idx_customer_accounts_user_id` ON `customer_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_customer_accounts_organization_id` ON `customer_accounts` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_customer_contacts_tenant_customer` ON `customer_contacts` (`tenant_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_customer_timeline_tenant_org_created` ON `customer_timeline_events` (`tenant_id`,`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_customer_timeline_entity` ON `customer_timeline_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_deliveries_tenant_status` ON `deliveries` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_deliveries_courier_id` ON `deliveries` (`courier_id`);--> statement-breakpoint
CREATE INDEX `idx_deliveries_tenant_order` ON `deliveries` (`tenant_id`,`order_ref`);--> statement-breakpoint
CREATE INDEX `idx_delivery_location_events_delivery_time` ON `delivery_location_events` (`delivery_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `idx_delivery_proofs_shipment_id` ON `delivery_proofs` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `idx_domine_events_tenant_status` ON `domine_events` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_domine_events_next_retry` ON `domine_events` (`status`,`next_retry_at`);--> statement-breakpoint
CREATE INDEX `idx_domine_events_dlq_tenant` ON `domine_events_dlq` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_domine_events_dlq_failed_at` ON `domine_events_dlq` (`failed_at`);--> statement-breakpoint
CREATE INDEX `idx_domine_intake_events_tenant_status` ON `domine_intake_events` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_domine_tenant_intake_configs_tenant` ON `domine_tenant_intake_configs` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_entity_custom_values_id` ON `entity_custom_values` (`tenant_id`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_finops_alert_events_tenant_created` ON `finops_alert_events` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_finops_alert_events_tenant_state` ON `finops_alert_events` (`tenant_id`,`next_state`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_finops_lock_events_tenant_active` ON `finops_lock_events` (`tenant_id`,`resolved_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_memory_tenant_session` ON `frank_conversation_memory` (`tenant_id`,`session_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_frank_events_tenant_id` ON `frank_events` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_frank_events_correlation_id` ON `frank_events` (`correlation_id`);--> statement-breakpoint
CREATE INDEX `idx_frank_events_created_at` ON `frank_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_intents_tenant_status` ON `frank_intent_training` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_frank_intents_created_at` ON `frank_intent_training` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_knowledge_tenant_created` ON `frank_knowledge` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_playbooks_tenant_intent_status` ON `frank_playbooks` (`tenant_id`,`intent`,`status`);--> statement-breakpoint
CREATE INDEX `idx_frank_rollout_decisions_tenant_id` ON `frank_rollout_decisions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_frank_rollout_decisions_request_id` ON `frank_rollout_decisions` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_frank_rollout_decisions_created_at` ON `frank_rollout_decisions` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_session_updated` ON `frank_session_state` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_suggestions_tenant_session` ON `frank_suggestions` (`tenant_id`,`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_frank_suggestions_tenant_conversation` ON `frank_suggestions` (`tenant_id`,`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_freight_conf_tenant_status` ON `freight_confirmations` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_freight_conf_simulation` ON `freight_confirmations` (`simulation_id`);--> statement-breakpoint
CREATE INDEX `idx_funnel_tenant_time` ON `freight_funnel_events` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_funnel_tenant_phone_hash_time` ON `freight_funnel_events` (`tenant_id`,`phone_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_freight_mem_tenant_carrier_zone` ON `freight_memory` (`tenant_id`,`carrier_name`,`zone_code`);--> statement-breakpoint
CREATE INDEX `idx_freight_mem_tenant_cep` ON `freight_memory` (`tenant_id`,`cep_prefix`);--> statement-breakpoint
CREATE INDEX `idx_freight_ops_settings_tenant_key` ON `freight_operational_settings` (`tenant_id`,`setting_key`);--> statement-breakpoint
CREATE INDEX `idx_freight_shipments_tenant_sim` ON `freight_shipments` (`tenant_id`,`simulation_id`);--> statement-breakpoint
CREATE INDEX `idx_freight_shipments_tenant_order` ON `freight_shipments` (`tenant_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `idx_freight_shipments_tracking` ON `freight_shipments` (`tracking_code`);--> statement-breakpoint
CREATE INDEX `idx_freight_sim_logs_tenant_created_at` ON `freight_simulation_logs` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_freight_sim_tenant_cep` ON `freight_simulations` (`tenant_id`,`cep_prefix`);--> statement-breakpoint
CREATE INDEX `idx_freight_sim_tenant_created` ON `freight_simulations` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_inbound_message_dedup_tenant_created_at` ON `inbound_message_dedup` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_inbound_message_dedup_created_at` ON `inbound_message_dedup` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_incoming_messages_unprocessed` ON `incoming_messages` (`processed`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_invoices_organization_id` ON `invoices` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_tenant_created_at` ON `messages` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_messages_tenant_phone_hash_created_at` ON `messages` (`tenant_id`,`phone_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_metrics_daily_tenant_day` ON `metrics_daily` (`tenant_id`,`day_date`);--> statement-breakpoint
CREATE INDEX `idx_metrics_daily_tenant_source_day` ON `metrics_daily` (`tenant_id`,`utm_source`,`day_date`);--> statement-breakpoint
CREATE INDEX `idx_metrics_daily_tenant_campaign_day` ON `metrics_daily` (`tenant_id`,`utm_campaign`,`day_date`);--> statement-breakpoint
CREATE INDEX `idx_op_events_tenant_domain_time` ON `operational_events` (`tenant_id`,`event_domain`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_op_events_tenant_type_time` ON `operational_events` (`tenant_id`,`event_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_op_events_tenant_customer_time` ON `operational_events` (`tenant_id`,`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_order_items_tenant_order` ON `order_items` (`tenant_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_status_history_tenant_order` ON `order_status_history` (`tenant_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_customer` ON `orders` (`tenant_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant_status` ON `orders` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_organizations_tenant_id` ON `organizations` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_organizations_cnpj_hash` ON `organizations` (`cnpj_hash`);--> statement-breakpoint
CREATE INDEX `idx_packing_profiles_tenant_id` ON `packing_profiles` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_packing_profiles_tenant_review` ON `packing_profiles` (`tenant_id`,`review_status`);--> statement-breakpoint
CREATE INDEX `idx_packing_profiles_tenant_active` ON `packing_profiles` (`tenant_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_report_module` ON `project_reports` (`module_key`);--> statement-breakpoint
CREATE INDEX `idx_public_events_tenant_created_at` ON `public_events` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_public_events_event_time` ON `public_events` (`event_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_public_events_anon_time` ON `public_events` (`anon_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_public_events_attribution_id` ON `public_events` (`attribution_id`);--> statement-breakpoint
CREATE INDEX `idx_sec_edge_events_created_at_route` ON `security_edge_events` (`created_at`,`route`);--> statement-breakpoint
CREATE INDEX `idx_sec_edge_events_tenant` ON `security_edge_events` (`tenant_claim`);--> statement-breakpoint
CREATE INDEX `idx_sec_incidents_created_at` ON `security_incidents` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sec_incidents_reason_window` ON `security_incidents` (`reason`,`window_end`);--> statement-breakpoint
CREATE INDEX `idx_shipments_tenant_order` ON `shipments` (`tenant_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `idx_simulations_tenant_created_at` ON `simulations` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sites_organization_id` ON `sites` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_sa_tenant_status_time` ON `supreme_actions` (`tenant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sa_tenant_type_time` ON `supreme_actions` (`tenant_id`,`action_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sb_domain_metric_segment` ON `supreme_benchmarks` (`benchmark_domain`,`benchmark_metric`,`segment_key`);--> statement-breakpoint
CREATE INDEX `idx_sb_computed_at` ON `supreme_benchmarks` (`computed_at`);--> statement-breakpoint
CREATE INDEX `idx_sf_tenant_status_time` ON `supreme_findings` (`tenant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sf_tenant_domain_time` ON `supreme_findings` (`tenant_id`,`finding_domain`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sf_tenant_severity_time` ON `supreme_findings` (`tenant_id`,`severity`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sp_domain` ON `supreme_playbooks` (`playbook_domain`);--> statement-breakpoint
CREATE INDEX `idx_sp_trigger` ON `supreme_playbooks` (`trigger_finding_type`);--> statement-breakpoint
CREATE INDEX `idx_tenant_ai_providers_tenant_id` ON `tenant_ai_providers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_tenant_config_category` ON `tenant_configurations` (`tenant_id`,`category`);--> statement-breakpoint
CREATE INDEX `idx_tenant_custom_fields_entity` ON `tenant_custom_fields` (`tenant_id`,`entity`);--> statement-breakpoint
CREATE INDEX `idx_tenant_chunks_tenant_version` ON `tenant_document_chunks` (`tenant_id`,`version_id`);--> statement-breakpoint
CREATE INDEX `idx_tenant_docs_tags_doc` ON `tenant_document_tags` (`tenant_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `idx_tenant_docs_tenant_status` ON `tenant_document_versions` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tenant_documents_tenant_created` ON `tenant_documents` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_tenant_events_tenant_created_at` ON `tenant_events` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_tenant_knowledge_queries_tenant_created` ON `tenant_knowledge_queries` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_tenant_playbooks_entity` ON `tenant_playbooks` (`tenant_id`,`entity`);--> statement-breakpoint
CREATE INDEX `idx_saved_views_tenant_module_updated_at` ON `tenant_saved_views` (`tenant_id`,`module`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_tenant_secrets_scope` ON `tenant_secrets` (`tenant_id`,`scope`);--> statement-breakpoint
CREATE INDEX `idx_tenant_usage_metrics_tenant_date_q` ON `tenant_usage_metrics` (`tenant_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_token_usage_events_tenant_created_at` ON `token_usage_events` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_user_consents_log_tenant_phone` ON `user_consents_log` (`tenant_id`,`phone_hash`);--> statement-breakpoint
CREATE INDEX `idx_user_ui_prefs_tenant_user` ON `user_ui_prefs` (`tenant_id`,`user_id`);