-- Migration: Frank execution state (FRK-9)
-- Created: 2026-09-09
-- Description: operational Run/Step state (optimistic-locking version) kept
-- separate from the append-only turn log. No backfill: tables start empty;
-- existing flows do not reference them until the runtime boundary adopts them.

CREATE TABLE IF NOT EXISTS `frank_runs` (
    `id` VARCHAR(36) PRIMARY KEY NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    `version` INT NOT NULL DEFAULT 1,
    `max_attempts` INT NOT NULL DEFAULT 3,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX `idx_frank_runs_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `frank_steps` (
    `id` VARCHAR(36) PRIMARY KEY NOT NULL,
    `run_id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `attempt` INT NOT NULL DEFAULT 1,
    `version` INT NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX `idx_frank_steps_run` (`run_id`),
    INDEX `idx_frank_steps_tenant` (`tenant_id`),
    CONSTRAINT `fk_frank_steps_run` FOREIGN KEY (`run_id`) REFERENCES `frank_runs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `frank_turns` (
    `id` VARCHAR(36) PRIMARY KEY NOT NULL,
    `run_id` VARCHAR(36) NOT NULL,
    `step_id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `turn` INT NOT NULL,
    `envelope_json` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE KEY `uq_frank_turns_run_turn` (`run_id`, `turn`),
    INDEX `idx_frank_turns_step` (`step_id`),
    INDEX `idx_frank_turns_tenant` (`tenant_id`),
    CONSTRAINT `fk_frank_turns_run` FOREIGN KEY (`run_id`) REFERENCES `frank_runs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
