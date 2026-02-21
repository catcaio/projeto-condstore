-- Custom incremental migration for hardening (idempotent)
ALTER TABLE `simulations` ADD COLUMN IF NOT EXISTS `idempotency_key` varchar(255);
--> statement-breakpoint
ALTER TABLE `simulations` ADD COLUMN IF NOT EXISTS `event` varchar(50) NOT NULL DEFAULT 'FREIGHT_QUOTED';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `simulations_idempotency_key_unique` ON `simulations` (`idempotency_key`);
-- We assume tenants table works or we skip it here as it was a side-effect.
