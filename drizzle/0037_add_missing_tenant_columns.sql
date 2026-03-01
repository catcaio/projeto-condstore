-- Custom migration for QA environments that were manually patched before
ALTER TABLE `tenants` ADD COLUMN `plan` varchar(50);
ALTER TABLE `tenants` ADD COLUMN `plan_status` varchar(50);
ALTER TABLE `tenants` ADD COLUMN `stripe_customer_id` varchar(255);
ALTER TABLE `tenants` ADD COLUMN `stripe_subscription_id` varchar(255);
ALTER TABLE `tenants` ADD COLUMN `twilio_number` varchar(30);
ALTER TABLE `tenants` ADD COLUMN `outbound_enabled` boolean DEFAULT true;
ALTER TABLE `tenants` ADD COLUMN `incident_mode` boolean DEFAULT false;
ALTER TABLE `tenants` ADD COLUMN `plan_current_period_end` timestamp;