require('dotenv').config({ path: '.env.production' });
const mysql = require('mysql2/promise');

(async () => {
    const dbUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
    const c = await mysql.createConnection(dbUrl);

    const [r] = await c.query('SELECT id, email FROM users LIMIT 1');
    console.log('Users query:', r.length ? JSON.stringify(r[0]) : 'empty table (no users yet)');

    const [inv] = await c.query("SHOW TABLES LIKE 'invites'");
    console.log('invites:', inv.length ? 'OK' : 'MISSING');

    const [tsp] = await c.query("SHOW TABLES LIKE 'tenant_signup_policies'");
    console.log('tenant_signup_policies:', tsp.length ? 'OK' : 'MISSING');

    await c.end();
})().catch(e => { console.error(e); process.exit(1) });
