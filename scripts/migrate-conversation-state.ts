import 'dotenv/config';
import { getDb } from '../src/infra/db';
import { sql } from 'drizzle-orm';

async function main() {
    const db = await getDb();

    console.log('Creating conversation_state table...');
    try {
        await db.execute(sql`
        CREATE TABLE IF NOT EXISTS conversation_state (
            id varchar(36) NOT NULL,
            tenant_id varchar(36) NOT NULL,
            phone_number varchar(30) NOT NULL,
            current_step varchar(50) NOT NULL DEFAULT 'NONE',
            context_json json,
            updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at timestamp NOT NULL,
            CONSTRAINT conversation_state_id PRIMARY KEY(id),
            CONSTRAINT conversation_state_unique UNIQUE(tenant_id, phone_number)
        );
      `);
        console.log('Table created (or exists).');

        console.log('Creating index idx_unique_state_tenant_phone...');
        // Note: Unique constraint usually creates an index, but explicit index creation if needed or just rely on constraint.
        // Drizzle definition has uniqueIndex. 
        // The CONSTRAINT above handles the uniqueness. 

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }

    console.log('Migration completed.');
    process.exit(0);
}

main();
