-- Migration: add plan column to tenants (idempotent)
ALTER TABLE `tenants` ADD COLUMN IF NOT EXISTS `plan` varchar(20) NOT NULL DEFAULT 'FREE';
