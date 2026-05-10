import { getDb } from '../../src/infra/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

async function checkColumns() {
    try {
        const db = await getDb();
        const [rows1]: any = await db.execute(sql`SHOW COLUMNS FROM messages`);
        fs.writeFileSync('cols.json', JSON.stringify(rows1, null, 2));
        console.log('Saved to cols.json');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkColumns();
