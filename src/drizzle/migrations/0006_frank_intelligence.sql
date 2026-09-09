-- Migration: Frank intelligence layer (FRK-8/008)
-- Created: 2026-09-09
-- Description: persisted, traceable recommendations (frank_suggestions),
-- operator decision loop (frank_feedbacks) and per-tenant preferences
-- (frank_preferences). The intelligence layer NEVER executes actions; it
-- only produces suggestions. Post-approval execution is delegated to the
-- existing execution boundary (frank_runs / frank_steps, migration 0005).
-- No backfill: tables start empty.

CREATE TABLE IF NOT EXISTS `frank_suggestions` (
    `id` VARCHAR(36) PRIMARY KEY NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `surface` VARCHAR(30) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `reason` TEXT NOT NULL,
    `confidence` DECIMAL(4,2) NOT NULL,
    `action_json` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `expires_at` TIMESTAMP NULL,
    INDEX `idx_frank_suggestions_tenant_surface` (`tenant_id`, `surface`),
    INDEX `idx_frank_suggestions_tenant_type` (`tenant_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `frank_feedbacks` (
    `id` VARCHAR(36) PRIMARY KEY NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `suggestion_id` VARCHAR(36) NOT NULL,
    `outcome` VARCHAR(20) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX `idx_frank_feedbacks_tenant` (`tenant_id`),
    INDEX `idx_frank_feedbacks_suggestion` (`suggestion_id`),
    CONSTRAINT `fk_frank_feedbacks_suggestion` FOREIGN KEY (`suggestion_id`) REFERENCES `frank_suggestions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `frank_preferences` (
    `tenant_id` VARCHAR(36) PRIMARY KEY NOT NULL,
    `disabled_types_json` TEXT NOT NULL,
    `min_confidence` DECIMAL(4,2) NOT NULL DEFAULT '0.75',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;