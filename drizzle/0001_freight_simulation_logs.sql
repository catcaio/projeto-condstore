CREATE TABLE `freight_simulation_logs` (
	`id` char(36) NOT NULL,
	`tenant_id` varchar(100) NOT NULL,
	`uf` varchar(2) NOT NULL,
	`peso` decimal(10,2) NOT NULL,
	`valor` decimal(10,2) NOT NULL,
	`prazo` int NOT NULL,
	`cep_hash` varchar(64) NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `freight_simulation_logs_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_freight_logs_tenant_created_at`
ON `freight_simulation_logs` (`tenant_id`,`created_at`);

CREATE INDEX `idx_freight_logs_tenant_uf_created_at`
ON `freight_simulation_logs` (`tenant_id`,`uf`,`created_at`);
