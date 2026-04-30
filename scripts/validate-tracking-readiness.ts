import { getDb } from '../src/infra/db';
import * as schema from '../src/drizzle/schema';
import { eq } from 'drizzle-orm';

async function validate() {
  console.log('=> Starting Tracking/Ads Readiness Validation...');
  try {
    const db = await getDb();
    const targetTenantId = process.env.TARGET_TENANT_ID || 'demo-mvp-tenant';

    // 1. Env check (Optional but recommended)
    const trackingEnvs = [
      'NEXT_PUBLIC_GA_MEASUREMENT_ID',
      'NEXT_PUBLIC_GTM_ID',
      'GOOGLE_ADS_CONVERSION_ID'
    ];
    let missingEnvs = false;
    for (const env of trackingEnvs) {
      if (!process.env[env]) {
        console.warn(`ℹ️  Tracking Env ${env} is NOT set. (MANUAL_RAFA) - Optional for core functionality.`);
        missingEnvs = true;
      } else {
        console.log(`✅ Env ${env} is set.`);
      }
    }

    // 2. Attribution Clicks table check (ensures tracking table exists)
    const clicksCount = await db.select({ id: schema.attributionClicks.id }).from(schema.attributionClicks).limit(1);
    console.log(`✅ Attribution clicks table accessible. Records: ${clicksCount.length}`);

    // 3. Public Events table check
    const eventsCount = await db.select({ id: schema.publicEvents.id }).from(schema.publicEvents).limit(1);
    console.log(`✅ Public events table accessible. Records: ${eventsCount.length}`);

    console.log('\n🚀 TRACKING READINESS: OK');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Tracking readiness check failed:', error.message);
    process.exit(1);
  }
}
validate();
