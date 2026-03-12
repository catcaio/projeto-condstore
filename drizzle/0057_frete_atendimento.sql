ALTER TABLE `simulations` ADD `customer_id` varchar(36);
ALTER TABLE `simulations` ADD `organization_id` varchar(36);
ALTER TABLE `simulations` ADD `conversation_id` varchar(36);
ALTER TABLE `simulations` ADD `created_by` varchar(36);
ALTER TABLE `simulations` ADD `source` varchar(30) NOT NULL DEFAULT 'API';
