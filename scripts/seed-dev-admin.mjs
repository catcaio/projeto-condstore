import mysql from 'mysql2/promise';
import crypto from 'node:crypto';

const connectionUri = process.env.DATABASE_URL || 'mysql://user:pass@127.0.0.1:3306/lojacond';

const tenantId = 'condstore-dev-tenant';
const adminEmail = 'admin@condstore.local';
const adminPassword = process.env.DEV_ADMIN_PASSWORD || 'Condstore@123';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const connection = await mysql.createConnection({ uri: connectionUri });

  try {
    await connection.execute(
      `INSERT INTO tenants
        (id, name, twilio_number, plan, plan_status, plan_current_period_end)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        twilio_number = VALUES(twilio_number),
        plan = VALUES(plan),
        plan_status = VALUES(plan_status),
        plan_current_period_end = VALUES(plan_current_period_end)`,
      [tenantId, 'Condstore Dev Tenant', 'whatsapp:+5511999999999', 'PRO', 'active'],
    );

    const [existingRows] = await connection.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [adminEmail],
    );

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      const userId = existingRows[0].id;
      await connection.execute(
        `UPDATE users
         SET password_hash = ?, tenant_id = ?, role = 'admin'
         WHERE id = ?`,
        [hashPassword(adminPassword), tenantId, userId],
      );
      console.log(`Updated existing admin user: ${adminEmail}`);
    } else {
      await connection.execute(
        `INSERT INTO users
          (id, email, password_hash, tenant_id, role, session_version)
         VALUES (?, ?, ?, ?, 'admin', 1)`,
        [crypto.randomUUID(), adminEmail, hashPassword(adminPassword), tenantId],
      );
      console.log(`Created admin user: ${adminEmail}`);
    }

    console.log('Seed complete.');
    console.log(`Login: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Tenant: ${tenantId} (plan_status=active)`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Failed to seed dev admin:', error);
  process.exit(1);
});
