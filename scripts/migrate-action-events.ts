import 'dotenv/config';
import { getDb } from '../src/infra/db';
import { sql } from 'drizzle-orm';

async function main() {
    const db = await getDb();

    console.log('Creating action_events table...');
    try {
        await db.execute(sql`
        CREATE TABLE IF NOT EXISTS action_events (
            id varchar(36) NOT NULL,
            tenant_id varchar(36) NOT NULL,
            message_id varchar(36) NOT NULL,
            intent varchar(50) NOT NULL,
            action_type varchar(50) NOT NULL,
            input_payload json,
            output_payload json,
            status varchar(20) NOT NULL,
            executed_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT action_events_id PRIMARY KEY(id),
            CONSTRAINT action_events_message_id_unique UNIQUE(message_id)
        );
      `);
        console.log('Table created (or exists).');

        console.log('Creating index idx_action_message...');
        await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_action_message ON action_events (message_id);
      `);
        console.log('Index created.');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }

    console.log('Migration completed.');
    process.exit(0);
}

main();
