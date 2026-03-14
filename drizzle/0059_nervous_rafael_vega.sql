ALTER TABLE `conversation_messages` ADD `provider_message_id` varchar(100);--> statement-breakpoint
ALTER TABLE `conversation_messages` ADD `delivery_status` varchar(30);--> statement-breakpoint
CREATE INDEX `idx_conversation_msgs_provider` ON `conversation_messages` (`provider_message_id`);