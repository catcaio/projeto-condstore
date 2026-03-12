ALTER TABLE `orders` MODIFY COLUMN `customer_id` varchar(36) NULL;
ALTER TABLE `orders` MODIFY COLUMN `status` varchar(50) NOT NULL DEFAULT 'CREATED';

ALTER TABLE `orders` ADD COLUMN `organization_id` varchar(36) NULL;
ALTER TABLE `orders` ADD COLUMN `conversation_id` varchar(36) NULL;
ALTER TABLE `orders` ADD COLUMN `quote_id` varchar(36) NULL;
ALTER TABLE `orders` ADD COLUMN `carrier` varchar(100) NULL;
ALTER TABLE `orders` ADD COLUMN `service` varchar(100) NULL;
ALTER TABLE `orders` ADD COLUMN `price` decimal(10,2) NULL;
ALTER TABLE `orders` ADD COLUMN `delivery_deadline` int NULL;
ALTER TABLE `orders` ADD COLUMN `created_by` varchar(36) NULL;
