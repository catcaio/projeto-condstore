UPDATE `tenant_ai_providers`
SET `api_key` = NULL
WHERE `api_key_encrypted` IS NOT NULL
  AND `api_key_encrypted` <> ''
  AND `api_key` IS NOT NULL;--> statement-breakpoint

ALTER TABLE `frank_events`
ADD COLUMN IF NOT EXISTS `rag_used` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `frank_events`
ADD COLUMN IF NOT EXISTS `rag_chunks` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `frank_events`
ADD COLUMN IF NOT EXISTS `rag_latency_ms` int NOT NULL DEFAULT 0;--> statement-breakpoint

UPDATE `frank_events` SET `tokens_prompt` = 0 WHERE `tokens_prompt` IS NULL;--> statement-breakpoint
UPDATE `frank_events` SET `tokens_completion` = 0 WHERE `tokens_completion` IS NULL;--> statement-breakpoint
UPDATE `frank_events` SET `rag_used` = 0 WHERE `rag_used` IS NULL;--> statement-breakpoint
UPDATE `frank_events` SET `rag_chunks` = 0 WHERE `rag_chunks` IS NULL;--> statement-breakpoint
UPDATE `frank_events` SET `rag_latency_ms` = 0 WHERE `rag_latency_ms` IS NULL;--> statement-breakpoint

ALTER TABLE `frank_events`
MODIFY COLUMN `tokens_prompt` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `frank_events`
MODIFY COLUMN `tokens_completion` int NOT NULL DEFAULT 0;
