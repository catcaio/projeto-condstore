import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDb } from './src/infra/db';
import { sql } from 'drizzle-orm';

async function check() {
  const db = await getDb();
  const res = await db.execute(sql`SELECT message_sid, direction, body, intent, created_at FROM messages ORDER BY created_at DESC LIMIT 5`);
  console.log('--- ULTIMAS 5 MENSAGENS NO SISTEMA ---');
  console.log(res[0]);
  process.exit(0);
}
check();
