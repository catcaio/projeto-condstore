import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDb } from './src/infra/db';
import { sql } from 'drizzle-orm';

async function check() {
  const db = await getDb();
  
  const msgs = await db.execute(sql`SELECT message_sid, body, from_phone, tenant_id FROM messages ORDER BY created_at DESC LIMIT 5`);
  const convs = await db.execute(sql`SELECT id, tenant_id, status FROM conversations ORDER BY created_at DESC LIMIT 5`);
  
  console.log('--- RECENT MESSAGES ---');
  console.log(msgs[0]);
  
  console.log('--- RECENT CONVERSATIONS ---');
  console.log(convs[0]);
  
  process.exit(0);
}

check();
