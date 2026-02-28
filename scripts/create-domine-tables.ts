import { getDb } from '../src/infra/db';
import { sql } from 'drizzle-orm';

async function run() {
    const db = await getDb();
    console.log('Creating domine_events...');
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS domine_events (
            id varchar(36) NOT NULL,
            tenant_id varchar(36) NOT NULL,
            source varchar(50) NOT NULL,
            type varchar(128) NOT NULL,
            idempotency_key varchar(255) NOT NULL,
            payload_json json,
            processed_at timestamp NULL,
            status varchar(30) NOT NULL DEFAULT 'queued',
            error_code varchar(100),
            error_message text,
            created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_domine_events_tenant_idempotency (tenant_id, idempotency_key),
            KEY idx_domine_events_tenant_status (tenant_id, status)
        );
    `);

    console.log('Creating domine_orders...');
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS domine_orders (
            id varchar(36) NOT NULL,
            tenant_id varchar(36) NOT NULL,
            order_id varchar(100) NOT NULL,
            status varchar(50) NOT NULL,
            totals json,
            updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_domine_orders_tenant_order (tenant_id, order_id)
        );
    `);

    console.log('Creating domine_freight_quotes...');
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS domine_freight_quotes (
            id varchar(36) NOT NULL,
            tenant_id varchar(36) NOT NULL,
            quote_id varchar(100) NOT NULL,
            order_id varchar(100),
            summary json,
            created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_domine_freight_quotes_tenant_quote (tenant_id, quote_id)
        );
    `);

    console.log('Done!');
    process.exit(0);
}

run().catch(console.error);
