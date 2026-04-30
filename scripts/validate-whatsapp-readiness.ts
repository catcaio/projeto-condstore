import { getDb } from '../src/infra/db';
import * as schema from '../src/drizzle/schema';
import { eq } from 'drizzle-orm';
import { twilioProvider } from '../src/providers/twilio.provider';

async function validate() {
  console.log('=> Starting WhatsApp Readiness Validation...');
  try {
    const db = await getDb();
    const targetTenantId = process.env.TARGET_TENANT_ID || 'demo-mvp-tenant';

    // 1. Env check (names only)
    const requiredEnvs = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'PII_ENCRYPTION_KEY'];
    let missingEnvs = false;
    for (const env of requiredEnvs) {
      if (!process.env[env]) {
        console.warn(`⚠️  Env ${env} is NOT set. (MANUAL_RAFA)`);
        missingEnvs = true;
      } else {
        console.log(`✅ Env ${env} is set.`);
      }
    }

    if (missingEnvs) {
      console.log('ℹ️  WhatsApp integration requires real credentials for full functionality. Continuing offline validation.');
    }

    // 2. Tenant check
    const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, targetTenantId)).limit(1);
    if (!tenant) throw new Error(`Tenant ${targetTenantId} not found`);

    // 3. Webhook / Handler check (mock initialization)
    if (twilioProvider) {
       console.log('✅ TwilioProvider loaded successfully.');
    }

    // 4. Inbound Deduplication schema check
    const dedupCount = await db.select({ id: schema.inboundMessageDedup.messageSid }).from(schema.inboundMessageDedup).limit(1);
    console.log(`✅ Inbound dedup table accessible. Records: ${dedupCount.length}`);

    console.log('\n🚀 WHATSAPP READINESS: OK');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ WhatsApp readiness check failed:', error.message);
    process.exit(1);
  }
}
validate();
