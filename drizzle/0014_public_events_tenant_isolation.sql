ALTER TABLE `public_events`
ADD COLUMN IF NOT EXISTS `tenant_id` varchar(36) NULL;--> statement-breakpoint
UPDATE `public_events`
SET `tenant_id` = 'legacy-unknown'
WHERE `tenant_id` IS NULL OR `tenant_id` = '';--> statement-breakpoint
ALTER TABLE `public_events`
MODIFY COLUMN `tenant_id` varchar(36) NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_public_events_tenant_created_at`
ON `public_events` (`tenant_id`,`created_at`);
