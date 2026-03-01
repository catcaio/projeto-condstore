const { createConnection } = require('mysql2/promise');

async function run() {
    const c = await createConnection(process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/lojacond');
    const queries = [
        "ALTER TABLE tenants ADD COLUMN plan varchar(50)",
        "ALTER TABLE tenants ADD COLUMN plan_status varchar(50)",
        "ALTER TABLE tenants ADD COLUMN stripe_customer_id varchar(255)",
        "ALTER TABLE tenants ADD COLUMN stripe_subscription_id varchar(255)",
        "ALTER TABLE tenants ADD COLUMN twilio_number varchar(30)",
        "ALTER TABLE tenants ADD COLUMN outbound_enabled boolean DEFAULT true",
        "ALTER TABLE tenants ADD COLUMN incident_mode boolean DEFAULT false",
        "ALTER TABLE tenants ADD COLUMN plan_current_period_end timestamp"
    ];

    for (const q of queries) {
        try {
            await c.query(q);
            console.log('Applied: ', q);
        } catch (e) {
            console.log('Skipped (likely exists): ', q);
        }
    }
    c.end();
    console.log('Done');
}

run();
