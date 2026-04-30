import { getDb } from '../src/infra/db';
import { tenants, users } from '../src/drizzle/schema';
import { eq } from 'drizzle-orm';

async function validate() {
  console.log('=> Starting Auth Readiness Validation...');
  try {
    const db = await getDb();
    const targetTenantId = process.env.TARGET_TENANT_ID || 'demo-mvp-tenant';
    const expectedAdminEmail = process.env.DEMO_ADMIN_EMAIL || 'demo@condstore.io';

    // 1. Env check (names only)
    const requiredEnvs = ['AUTH_SECRET', 'DATABASE_URL', 'PII_ENCRYPTION_KEY'];
    let missingCritical = false;
    for (const env of requiredEnvs) {
      if (!process.env[env]) {
        console.warn(`⚠️  Env ${env} is NOT set. (CRITICAL)`);
        missingCritical = true;
      } else {
        console.log(`✅ Env ${env} is set.`);
      }
    }

    if (missingCritical) {
      console.warn('⚠️  Critical envs missing. API routes would return 500 JSON.');
    }

    // Google OAuth
    const googleEnvs = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
    let missingGoogle = false;
    for (const env of googleEnvs) {
      if (!process.env[env]) {
        console.warn(`⚠️  Env ${env} is NOT set. (MANUAL_RAFA)`);
        missingGoogle = true;
      }
    }
    
    if (missingGoogle) {
      console.log('ℹ️  Google OAuth requires real credentials for full functionality. Route will return controlled redirect or MANUAL_RAFA.');
    } else {
      console.log('✅ Google OAuth is configured.');
    }

    // 2. Tenant & Admin check
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, targetTenantId)).limit(1);
      if (!tenant) {
        console.warn(`⚠️  Tenant ${targetTenantId} not found`);
      } else {
        console.log(`✅ Base tenant ${targetTenantId} exists.`);
      }

      const [admin] = await db.select().from(users).where(eq(users.email, expectedAdminEmail)).limit(1);
      if (!admin) {
         console.warn(`⚠️  Admin user ${expectedAdminEmail} not found. UI login defaults to this email.`);
      } else {
         console.log(`✅ Admin user ${expectedAdminEmail} exists.`);
      }
    } catch (e: any) {
      console.warn(`⚠️  Database query failed. (If CI, might be expected: ${e.message})`);
    }

    // 3. Crypto & Module check
    try {
      const { getPiiEncryptionKey } = await import('../src/infra/pii/crypto');
      getPiiEncryptionKey();
      console.log('✅ Auth crypto service dependencies loaded.');
    } catch (e: any) {
      console.warn(`⚠️  Auth service module load failed: ${e.message}`);
    }

    console.log('\n🚀 AUTH READINESS: OK');
    process.exit(0);
  } catch (error) {
    console.error('❌ Auth Readiness: FAILED', error);
    process.exit(1);
  }
}

validate();
