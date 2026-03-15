ALTER TABLE `frank_session_state` ADD `last_referenced_shipment_id` varchar(36);
--> statement-breakpoint
ALTER TABLE `frank_session_state` ADD `last_referenced_quote_id` varchar(36);
--> statement-breakpoint
ALTER TABLE `frank_session_state` ADD `last_referenced_customer_id` varchar(36);
--> statement-breakpoint
ALTER TABLE `frank_session_state` ADD `last_tool_used` varchar(60);
