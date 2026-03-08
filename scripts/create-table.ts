import { getDb } from '../src/infra/db';
import { sql } from 'drizzle-orm';

async function createTable() {
    console.log('Creating freight_shipments table...');
    const db = await getDb();
    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS freight_simulations (
        id VARCHAR(36) PRIMARY KEY NOT NULL,
        tenant_id VARCHAR(36) NOT NULL,
        cep VARCHAR(10) NOT NULL,
        cep_prefix VARCHAR(5) NOT NULL,
        zone_code VARCHAR(30),
        carrier_considered JSON,
        carrier_selected VARCHAR(60),
        product_hash VARCHAR(64),
        product_refs JSON,
        product_family JSON,
        total_weight DECIMAL(10,2) NOT NULL,
        cubed_weight DECIMAL(10,2) NOT NULL,
        charged_weight DECIMAL(10,2) NOT NULL,
        total_volumes INT NOT NULL DEFAULT 1,
        volume_details JSON,
        dimension_source VARCHAR(30),
        packing_rule_version INT,
        quoted_freight DECIMAL(10,2),
        breakdown_json JSON,
        strategy_used VARCHAR(30),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS freight_confirmations (
        id VARCHAR(36) PRIMARY KEY NOT NULL,
        tenant_id VARCHAR(36) NOT NULL,
        simulation_id VARCHAR(36),
        order_id VARCHAR(36),
        cep VARCHAR(10) NOT NULL,
        cep_prefix VARCHAR(5) NOT NULL,
        zone_code VARCHAR(30),
        carrier_name VARCHAR(60) NOT NULL,
        product_hash VARCHAR(64),
        product_family JSON,
        total_weight DECIMAL(10,2) NOT NULL,
        charged_weight DECIMAL(10,2) NOT NULL,
        total_volumes INT NOT NULL DEFAULT 1,
        quoted_freight DECIMAL(10,2),
        confirmed_freight DECIMAL(10,2),
        delta_value DECIMAL(10,2),
        confirmation_source VARCHAR(30),
        status VARCHAR(20) NOT NULL DEFAULT 'SIMULATED',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS freight_memory (
        id VARCHAR(36) PRIMARY KEY NOT NULL,
        tenant_id VARCHAR(36) NOT NULL,
        cep_prefix VARCHAR(5) NOT NULL,
        zone_code VARCHAR(30),
        carrier_name VARCHAR(60) NOT NULL,
        product_family VARCHAR(60),
        weight_band VARCHAR(30),
        volume_band VARCHAR(30),
        avg_confirmed_freight DECIMAL(10,2),
        avg_delta DECIMAL(10,2),
        confirmations_count INT NOT NULL DEFAULT 0,
        confidence_score VARCHAR(10) NOT NULL DEFAULT 'low',
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS freight_shipments (
        id VARCHAR(36) PRIMARY KEY NOT NULL,
        tenant_id VARCHAR(36) NOT NULL,
        simulation_id VARCHAR(36),
        carrier VARCHAR(60) NOT NULL,
        service VARCHAR(60) NOT NULL,
        tracking_code VARCHAR(60),
        shipment_price DECIMAL(10,2),
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_freight_shipments_tenant_sim (tenant_id, simulation_id),
        INDEX idx_freight_shipments_tracking (tracking_code)
    )
  `);
    console.log('Table created successfully');
    process.exit(0);
}

createTable().catch(console.error);
