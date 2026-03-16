DROP INDEX `idx_conversation_msgs_provider` ON `conversation_messages`;--> statement-breakpoint
UPDATE `conversation_messages` SET `direction` = LOWER(`direction`);--> statement-breakpoint
ALTER TABLE `conversation_messages` MODIFY COLUMN `direction` enum('inbound','outbound') NOT NULL;--> statement-breakpoint
ALTER TABLE `conversation_messages` MODIFY COLUMN `delivery_status` enum('queued','sent','delivered','read','failed');--> statement-breakpoint
UPDATE `conversations` SET `status` = 'operator_active' WHERE `status` = 'human_active';--> statement-breakpoint
UPDATE `conversations` SET `status` = 'triaged' WHERE `status` = 'waiting_internal';--> statement-breakpoint
UPDATE `conversations` SET `status` = 'new' WHERE `status` = 'open';--> statement-breakpoint
UPDATE `conversations` SET `status` = LOWER(`status`);--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `status` enum('new','triaged','awaiting_human','draft_ready','approved','sent','delivered','closed','blocked_guardrail','operator_active','failed_delivery') NOT NULL DEFAULT 'new';--> statement-breakpoint
ALTER TABLE `conversation_messages` ADD CONSTRAINT `uq_conversation_msgs_provider` UNIQUE(`provider_message_id`);