import { getDb } from './src/infra/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const db = await getDb();
    const res = await db.execute(sql`SELECT payload_hash FROM webhook_events ORDER BY created_at DESC LIMIT 5`);
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
}
main();
