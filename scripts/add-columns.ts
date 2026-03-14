import { getDb } from '../src/infra/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    console.log('--- ADDING COLUMNS ---');
    try {
        const db = await getDb();
        console.log('Connected to DB');
        await db.execute(sql`ALTER TABLE conversation_messages ADD COLUMN provider_message_id varchar(255);`);
        console.log('✅ Added provider_message_id');
        await db.execute(sql`ALTER TABLE conversation_messages ADD COLUMN delivery_status varchar(50);`);
        console.log('✅ Added delivery_status');
    } catch (e: any) {
        if (e.message?.includes('Duplicate column name')) {
            console.log('Columns already exist. Proceeding...');
        } else {
            console.error('SQL Error:', e);
        }
    }
    process.exit(0);
}

run();
