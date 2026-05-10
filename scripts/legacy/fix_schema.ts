import { getDb } from '../../src/infra/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function fixSchema() {
    try {
        console.log('[*] Connecting to database...');
        const db = await getDb();
        console.log('[*] Altering messages table...');
        
        await db.execute(sql`
            ALTER TABLE \`messages\`
            ADD COLUMN \`tenant_id\` varchar(36) NOT NULL AFTER \`message_sid\`;
        `);
        
        console.log('[SUCCESS] tenant_id column added to messages!');
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('[SKIP] Column already exists!');
        } else {
            console.error('[ERROR]', e);
        }
    }
    process.exit(0);
}

fixSchema();
