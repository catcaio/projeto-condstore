import { getDb } from '../../src/infra/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    console.log('[*] Connecting to database...');
    const db = await getDb();
    
    // Check if tables exist
    const [rows]: any = await db.execute(sql`SHOW TABLES`);
    const tables = rows.map((r: any) => Object.values(r)[0]);

    const criticalTables = [
        'webhook_events',
        'inbound_message_dedup',
        'end_user_consents',
        'conversations',
        'conversation_messages',
        'frank_suggestions',
        'operational_events'
    ];

    let allOk = true;
    for (const t of criticalTables) {
        if (tables.includes(t)) {
            console.log(`[OK] Table exists: ${t}`);
        } else {
            console.log(`[FAIL] Missing table: ${t}`);
            allOk = false;
        }
    }

    if (allOk) {
        console.log('\n[SUCCESS] All critical tables are present in the database.');
    } else {
        console.log('\n[ERROR] One or more critical tables are missing.');
    }
    
    process.exit(0);
}

check().catch(console.error);
