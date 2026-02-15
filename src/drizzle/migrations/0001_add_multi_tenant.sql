-- Migration: Add Multi-Tenant Support
-- Created: 2026-02-15
-- Description: Creates tenants table and adds tenant_id to messages and simulations

-- Step 1: Create tenants table
CREATE TABLE IF NOT EXISTS `tenants` (
    `id` VARCHAR(36) PRIMARY KEY NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `twilio_number` VARCHAR(30) NOT NULL UNIQUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX `idx_twilio_number` (`twilio_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Add tenant_id to messages table
ALTER TABLE `messages` 
ADD COLUMN `tenant_id` VARCHAR(36) NULL AFTER `message_sid`,
ADD INDEX `idx_tenant_id` (`tenant_id`);

-- Step 3: Add tenant_id to simulations table
ALTER TABLE `simulations` 
ADD COLUMN `tenant_id` VARCHAR(36) NULL AFTER `id`,
ADD INDEX `idx_tenant_id` (`tenant_id`);

-- Step 4: Add foreign key constraints (after backfill)
-- These will be added in a separate migration after data backfill
-- ALTER TABLE `messages` ADD CONSTRAINT `fk_messages_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE;
-- ALTER TABLE `simulations` ADD CONSTRAINT `fk_simulations_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE;
