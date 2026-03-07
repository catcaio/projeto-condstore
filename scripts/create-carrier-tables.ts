/**
 * Create carrier tables in the real database.
 * Usage: npx tsx scripts/create-carrier-tables.ts
 */
import { getDb } from '../src/infra/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Creating carrier tables...');
    const db = await getDb();

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS carrier_policies (
            id VARCHAR(36) PRIMARY KEY NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            carrier_name VARCHAR(60) NOT NULL,
            origin_city VARCHAR(80),
            origin_state VARCHAR(2),
            cubage_factor DECIMAL(8,2) NOT NULL DEFAULT 300,
            weight_threshold_excess DECIMAL(8,2),
            delivery_time_days_base INT NOT NULL DEFAULT 7,
            notes TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
            INDEX idx_carrier_policies_tenant_carrier (tenant_id, carrier_name)
        )
    `);
    console.log('  ✅ carrier_policies');

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS carrier_zones (
            id VARCHAR(36) PRIMARY KEY NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            carrier_name VARCHAR(60) NOT NULL,
            zone_code VARCHAR(20) NOT NULL,
            region_name VARCHAR(80),
            capital_or_interior VARCHAR(10),
            state VARCHAR(2),
            cep_range_start VARCHAR(8),
            cep_range_end VARCHAR(8),
            notes TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            INDEX idx_carrier_zones_tenant_carrier_zone (tenant_id, carrier_name, zone_code),
            INDEX idx_carrier_zones_tenant_carrier_state (tenant_id, carrier_name, state)
        )
    `);
    console.log('  ✅ carrier_zones');

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS carrier_rate_rows (
            id VARCHAR(36) PRIMARY KEY NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            carrier_name VARCHAR(60) NOT NULL,
            zone_code VARCHAR(20) NOT NULL,
            weight_band_max DECIMAL(10,2) NOT NULL,
            base_price DECIMAL(10,2) NOT NULL,
            excess_kg_price DECIMAL(10,4),
            adv_percent DECIMAL(6,4),
            adv_min DECIMAL(10,2),
            gris_percent DECIMAL(6,4),
            gris_min DECIMAL(10,2),
            tas_value DECIMAL(10,2),
            trt_percent DECIMAL(6,4),
            trt_min DECIMAL(10,2),
            pedagio_value DECIMAL(10,2),
            pedagio_fraction_kg DECIMAL(10,2),
            emex_value DECIMAL(10,2),
            emex_percent DECIMAL(6,4),
            txa_value DECIMAL(10,2),
            fpk_value DECIMAL(10,2),
            fv_percent DECIMAL(6,4),
            delivery_time_days INT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            INDEX idx_carrier_rate_rows_tenant_carrier_zone (tenant_id, carrier_name, zone_code),
            INDEX idx_carrier_rate_rows_lookup (tenant_id, carrier_name, zone_code, weight_band_max)
        )
    `);
    console.log('  ✅ carrier_rate_rows');

    console.log('\nAll carrier tables created successfully.');
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
