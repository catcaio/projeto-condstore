CREATE TABLE `conversation_assignments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`assigned_to` varchar(36) NOT NULL,
	`assigned_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `conversation_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`direction` varchar(20) NOT NULL,
	`source` varchar(30) NOT NULL,
	`message` text NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `conversation_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`organization_id` varchar(36),
	`phone_hash` varchar(64) NOT NULL,
	`phone_encrypted` varchar(255) NOT NULL,
	`channel` varchar(20) NOT NULL DEFAULT 'WHATSAPP',
	`status` varchar(30) NOT NULL DEFAULT 'OPEN',
	`assigned_to` varchar(36),
	`last_message_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_conversation_assign_conv` ON `conversation_assignments` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_conversation_msgs_conv_created` ON `conversation_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_conversations_tenant_phone` ON `conversations` (`tenant_id`,`phone_hash`);--> statement-breakpoint
CREATE INDEX `idx_conversations_tenant_status` ON `conversations` (`tenant_id`,`status`);
