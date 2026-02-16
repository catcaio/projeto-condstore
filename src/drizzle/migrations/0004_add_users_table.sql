-- Migration: Add Users Table (Authentication)
-- Created: 2026-02-16
-- Description: Creates users table for portal authentication
-- Run manually: DO NOT auto-execute

CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(36) PRIMARY KEY NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(512) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'operator',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_tenant_id` (`tenant_id`),
    CONSTRAINT `fk_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
