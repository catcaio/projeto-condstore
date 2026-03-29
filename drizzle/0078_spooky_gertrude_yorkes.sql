ALTER TABLE `frank_session_state` ADD `attribution_token` varchar(128);--> statement-breakpoint
ALTER TABLE `frank_session_state` ADD `utm_source` varchar(255);--> statement-breakpoint
ALTER TABLE `frank_session_state` ADD `utm_medium` varchar(255);--> statement-breakpoint
ALTER TABLE `frank_session_state` ADD `utm_campaign` varchar(255);