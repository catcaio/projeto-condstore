import { getDb } from '../src/infra/db';
import { users, tenants } from '../src/drizzle/schema';
import { eq } from 'drizzle-orm';

async function validate() {
  console.log('=> Starting Auth Readiness Validation...');
  
  const envs = ['AUTH_SECRET', 'DATABASE_URL', 'PII_ENCRYPTION_KEY'];
  for (const env of envs) {
    if (!process.env[env]) {
      console.error(`❌ Missing critical env: ${env}`);
      process.exit(1);
    }
    console.log(`✅ Env ${env} is set.`);
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️  Env GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is NOT set. (MANUAL_RAFA)');
    console.log('ℹ️  Google OAuth requires real credentials for full functionality. Route will return controlled redirect or MANUAL_RAFA.');
  }

  try {
    const db = await getDb();
    
    // Check base tenant
    const baseTenant = await db.select().from(tenants).limit(1);
    if (baseTenant.length === 0) {
      console.warn('⚠️  No tenants found in database. Seed might be missing.');
    } else {
      console.log('✅ Base tenant exists.');
    }

    // Check admin user
    const adminUser = await db.select().from(users).where(eq(users.email, 'demo@condstore.io')).limit(1);
    if (adminUser.length === 0) {
      console.warn('⚠️  Admin user demo@condstore.io NOT found.');
    } else {
      console.log('✅ Admin user demo@condstore.io exists.');
    }

    // Test crypto service initialization
    const { getPiiEncryptionKey } = await import('../src/infra/pii/crypto');
    getPiiEncryptionKey();
    console.log('✅ Auth crypto service dependencies loaded.');

    console.log('\n🚀 AUTH READINESS: OK');
    process.exit(0);
  } catch (error) {
    console.error('❌ Auth Readiness: FAILED', error);
    process.exit(1);
  }
}

validate();
