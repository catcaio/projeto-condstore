import 'dotenv/config';
import mysql from 'mysql2/promise';

async function run() {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    const [rows] = await conn.execute('SELECT * FROM tenants WHERE id="LOJACOND"');
    console.log(rows);

    if (rows.length === 0) {
        await conn.execute(`
            INSERT INTO tenants (id, name, twilio_number, plan_status, plan) 
            VALUES ('LOJACOND', 'Loja Cond', 'fake_number_qa', 'active', 'ENTERPRISE')
        `);
        console.log('LOJACOND Created in DB');
    } else {
        await conn.execute(`
            UPDATE tenants SET plan_status = 'active', plan = 'ENTERPRISE' WHERE id='LOJACOND'
        `);
        console.log('LOJACOND Updated constraint in DB');
    }

    process.exit(0);
}

run().catch(console.error);
