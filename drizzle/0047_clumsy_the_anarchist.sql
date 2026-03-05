CREATE TABLE `user_ui_prefs` (
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`key` varchar(100) NOT NULL,
	`payload_json` json NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_ui_prefs_tenant_id_user_id_key_pk` PRIMARY KEY(`tenant_id`,`user_id`,`key`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_ui_prefs_tenant_user` ON `user_ui_prefs` (`tenant_id`,`user_id`);