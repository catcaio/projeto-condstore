import { getDb } from '../../src/infra/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkDrizzleLog() {
    try {
        const db = await getDb();
        console.log('--- MIGRATIONS ---');
        const [rows1]: any = await db.execute(sql`SELECT * FROM \`__drizzle_migrations\` ORDER BY created_at DESC LIMIT 10`);
        console.table(rows1);
        
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkDrizzleLog();
