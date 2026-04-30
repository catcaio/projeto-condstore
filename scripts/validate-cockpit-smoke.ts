import { getDb } from '../src/infra/db';
import * as schema from '../src/drizzle/schema';
import { eq, count } from 'drizzle-orm';

async function validate() {
  console.log('=> Starting Cockpit Smoke Validation...');
  try {
    const db = await getDb();
    const targetTenantId = process.env.TARGET_TENANT_ID || 'demo-mvp-tenant';

    // 1. Dashboard Metrics check (simulating API logic)
    const orderMetrics = await db.select({ total: count(schema.orders.id) })
      .from(schema.orders)
      .where(eq(schema.orders.tenantId, targetTenantId));
    
    console.log(`✅ Orders metric query succeeded. Total orders: ${orderMetrics[0].total}`);

    const quoteMetrics = await db.select({ total: count(schema.simulations.id) })
      .from(schema.simulations)
      .where(eq(schema.simulations.tenantId, targetTenantId));
    
    console.log(`✅ Quotes metric query succeeded. Total quotes: ${quoteMetrics[0].total}`);

    // 2. Roles/Users check (RBAC basics)
    const adminUser = await db.select().from(schema.users)
      .where(eq(schema.users.tenantId, targetTenantId))
      .limit(1);

    if (adminUser.length === 0) {
      console.warn('⚠️  No users found for tenant. Cockpit might be inaccessible.');
    } else {
      console.log(`✅ Tenant has ${adminUser.length} user(s). RBAC base check OK.`);
    }

    // 3. Env Auth Check
    if (!process.env.AUTH_SECRET) {
      console.warn('⚠️  AUTH_SECRET is NOT set. Login will fail in runtime. (MANUAL_RAFA)');
    } else {
      console.log('✅ AUTH_SECRET is set.');
    }

    console.log('\n🚀 COCKPIT SMOKE: OK');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Cockpit smoke check failed:', error.message);
    process.exit(1);
  }
}
validate();
