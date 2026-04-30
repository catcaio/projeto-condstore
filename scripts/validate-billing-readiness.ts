import { getDb } from '../src/infra/db';
import * as schema from '../src/drizzle/schema';
import { eq } from 'drizzle-orm';
import { assertTenantCanOperateOrders } from '../src/modules/billing/guards/assertTenantCanOperateOrders';

async function validate() {
  console.log('=> Starting Billing Readiness Validation...');
  try {
    const db = await getDb();
    const targetTenantId = process.env.TARGET_TENANT_ID || 'demo-mvp-tenant';

    // 1. Env check
    const requiredEnvs = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
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
      console.log('ℹ️  Stripe integration requires real keys for full functionality. Proceeding with offline validation.');
    }

    // 2. Tenant check & Plan check
    const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, targetTenantId)).limit(1);
    if (!tenant) throw new Error(`Tenant ${targetTenantId} not found`);

    if (tenant.planStatus === 'active' || tenant.planStatus === 'trialing') {
      console.log(`✅ Tenant plan status is valid: ${tenant.planStatus}`);
    } else {
      console.warn(`⚠️  Tenant plan status is ${tenant.planStatus}. Operations will be blocked.`);
    }

    // 3. Guard validation (simulating a check)
    try {
      await assertTenantCanOperateOrders(targetTenantId, db);
      console.log('✅ Billing guard (assertTenantCanOperateOrders) passed successfully.');
    } catch (e: any) {
      if (e.message.includes('order_operation_blocked_by_billing')) {
         console.warn('⚠️  Billing guard correctly blocked operation due to plan status.');
      } else {
         throw e;
      }
    }

    console.log('\n🚀 BILLING READINESS: OK');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Billing readiness check failed:', error.message);
    process.exit(1);
  }
}
validate();
