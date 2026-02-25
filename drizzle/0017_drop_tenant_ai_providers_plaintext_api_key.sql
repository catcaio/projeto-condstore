UPDATE `tenant_ai_providers`
SET `api_key` = NULL
WHERE `api_key` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `tenant_ai_providers` DROP COLUMN `api_key`;
