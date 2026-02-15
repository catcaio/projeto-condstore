-- Migration: Make tenant_id NOT NULL
-- Created: 2026-02-15
-- Description: After backfill, make tenant_id required and add foreign keys

-- Step 1: Make tenant_id NOT NULL
ALTER TABLE `messages` 
MODIFY COLUMN `tenant_id` VARCHAR(36) NOT NULL;

ALTER TABLE `simulations` 
MODIFY COLUMN `tenant_id` VARCHAR(36) NOT NULL;

-- Step 2: Add foreign key constraints
ALTER TABLE `messages` 
ADD CONSTRAINT `fk_messages_tenant` 
FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE;

ALTER TABLE `simulations` 
ADD CONSTRAINT `fk_simulations_tenant` 
FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE;
