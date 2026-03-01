import mysql from 'mysql2/promise';
import 'dotenv/config';

async function run() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL not set");
        process.exit(1);
    }
    const connection = await mysql.createConnection(url);
    try {
        console.log("Adding columns to tenants table if missing...");
        await connection.query("ALTER TABLE tenants ADD COLUMN plan VARCHAR(50);").catch(e => console.log(e.message));
        await connection.query("ALTER TABLE tenants ADD COLUMN plan_status VARCHAR(50);").catch(e => console.log(e.message));
        await connection.query("ALTER TABLE tenants ADD COLUMN stripe_customer_id VARCHAR(255);").catch(e => console.log(e.message));
        await connection.query("ALTER TABLE tenants ADD COLUMN stripe_subscription_id VARCHAR(255);").catch(e => console.log(e.message));
        await connection.query("ALTER TABLE tenants ADD COLUMN twilio_number VARCHAR(30);").catch(e => console.log(e.message));
        await connection.query("ALTER TABLE tenants ADD COLUMN outbound_enabled BOOLEAN DEFAULT true;").catch(e => console.log(e.message));
        await connection.query("ALTER TABLE tenants ADD COLUMN incident_mode BOOLEAN DEFAULT false;").catch(e => console.log(e.message));
        await connection.query("ALTER TABLE tenants ADD COLUMN plan_current_period_end TIMESTAMP;").catch(e => console.log(e.message));
        console.log("DB patch complete.");
    } finally {
        await connection.end();
    }
}

run();
