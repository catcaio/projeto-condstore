import { getDb } from '../src/infra/db';
import * as schema from '../src/drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function validate() {
  console.log('=> Starting First Tenant Readiness Validation...');
  
  const db = await getDb();
  const targetTenantId = process.env.TARGET_TENANT_ID || 'demo-mvp-tenant';
  const targetAdminEmail = process.env.TARGET_ADMIN_EMAIL || 'demo@condstore.io';

  console.log(`=> Validating tenant: ${targetTenantId}`);

  try {
    // 1. Validar Tenant
    const [tenant] = await db.select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, targetTenantId))
      .limit(1);

    if (!tenant) {
      console.error(`❌ Tenant ${targetTenantId} not found in database.`);
      process.exit(1);
    }
    console.log('✅ Tenant exists.');

    // 2. Validar Plan Status
    const allowedStatuses = ['active', 'trialing'];
    if (!allowedStatuses.includes(tenant.planStatus || '')) {
      console.error(`❌ Tenant planStatus is "${tenant.planStatus}", expected active or trialing.`);
      process.exit(1);
    }
    console.log(`✅ Plan status is valid: ${tenant.planStatus}`);

    // 3. Validar Usuário Admin
    const [admin] = await db.select()
      .from(schema.users)
      .where(and(
        eq(schema.users.tenantId, targetTenantId),
        eq(schema.users.email, targetAdminEmail)
      ))
      .limit(1);

    if (!admin) {
      console.error(`❌ Admin user ${targetAdminEmail} not found for tenant ${targetTenantId}.`);
      process.exit(1);
    }
    console.log('✅ Admin user exists.');

    if (admin.role !== 'admin') {
      console.error(`❌ User ${targetAdminEmail} has role "${admin.role}", expected "admin".`);
      process.exit(1);
    }
    console.log('✅ Admin role is correct.');

    // 4. Validar Configurações Mínimas (ex: WhatsApp/Twilio ou Freight)
    const [config] = await db.select()
      .from(schema.tenantConfigurations)
      .where(eq(schema.tenantConfigurations.tenantId, targetTenantId))
      .limit(1);
    
    if (!config) {
      console.warn('⚠️ No specific tenant configurations found. Using system defaults.');
    } else {
      console.log('✅ Tenant configurations found.');
    }

    // 5. Validar dados operacionais mínimos (Conversations)
    const conversations = await db.select({ id: schema.conversations.id })
      .from(schema.conversations)
      .where(eq(schema.conversations.tenantId, targetTenantId))
      .limit(10);
    
    console.log(`ℹ️ Operational data: ${conversations.length} conversations found.`);

    console.log('\n🚀 FIRST TENANT READINESS: OK');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Readiness check failed with error:', error.message);
    process.exit(1);
  }
}

validate();
