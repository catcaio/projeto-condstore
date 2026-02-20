
import * as dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../src/infra/db';
import { sql } from 'drizzle-orm';
import { logger } from '../src/infra/logger';

async function main() {
    console.log('Starting Freight Funnel migration...');
    const db = await getDb();

    try {
        // Drop old table if exists
        try {
            await db.execute(sql.raw(`DROP TABLE IF EXISTS conversation_funnel_events`));
            console.log('Dropped old conversation_funnel_events table');
        } catch (e: any) {
            console.warn('Warning dropping table:', e.message);
        }

        // Create new table
        await db.execute(sql.raw(`
            CREATE TABLE IF NOT EXISTS freight_funnel_events (
                id VARCHAR(36) PRIMARY KEY NOT NULL,
                tenant_id VARCHAR(36) NOT NULL,
                phone_number VARCHAR(30) NOT NULL,
                session_id VARCHAR(36) NOT NULL,
                stage VARCHAR(50) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY idx_funnel_unique_stage (session_id, stage),
                INDEX idx_funnel_tenant_time (tenant_id, created_at)
            )
        `));
        console.log('Created freight_funnel_events table');

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error: any) {
        console.error('Migration failed:', error);
        if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
        process.exit(1);
    }
}

main();
