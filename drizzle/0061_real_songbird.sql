ALTER TABLE `frank_session_state` ADD `auto_responses_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `frank_session_state` ADD `last_auto_response_at` timestamp;