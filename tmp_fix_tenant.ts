import { getDb } from './src/infra/db';
import { tenants } from './src/drizzle/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const db = await getDb();
    await db.update(tenants).set({ twilioNumber: 'whatsapp:+14155238886' }).where(eq(tenants.id, 'LOJACOND'));
    console.log("Updated LOJACOND twilioNumber to whatsapp:+14155238886");
    
    // Also update qa-tenant to have standard prefix
    await db.update(tenants).set({ twilioNumber: 'whatsapp:+5511999999999' }).where(eq(tenants.id, 'qa-tenant'));
    console.log("Updated qa-tenant twilioNumber to whatsapp:+5511999999999");
    
    process.exit(0);
}
main();
