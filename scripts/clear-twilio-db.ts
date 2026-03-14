import { eq, and } from 'drizzle-orm';
import { getDb } from '../src/infra/db';
import { tenantSecrets } from '../src/drizzle/schema';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = await getDb();
  const deleted = await db.delete(tenantSecrets).where(and(eq(tenantSecrets.tenantId, 'LOJACOND'), eq(tenantSecrets.provider, 'twilio')));
  console.log('Cleared Twilio secrets for LOJACOND from DB.', deleted);
  process.exit(0);
}
run().catch(console.error);
