import { getDb } from '../infra/db';
import { tenants } from '../drizzle/schema';
import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { normalizeWhatsAppNumber } from '../lib/normalize';

async function run() {
    console.log('--- Starting Tenant Upsert ---');

    const rawNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.argv[2];
    if (!rawNumber) {
        console.error('Error: Please provide a WhatsApp number via TWILIO_WHATSAPP_NUMBER env or script CLI argument.');
        process.exit(1);
    }

    // Ensure it has whatsapp:+ format
    const twilioNumber = rawNumber.startsWith('whatsapp:') ? rawNumber : `whatsapp:${rawNumber}`;
    console.log(`Target Twilio Number: ${twilioNumber}`);

    const db = await getDb();

    // Upsert the tenant
    await db.insert(tenants)
        .values({
            id: randomUUID(),
            name: 'Corporate Tenant',
            twilioNumber: twilioNumber,
        })
        .onDuplicateKeyUpdate({
            set: {
                twilioNumber: twilioNumber,
            }
        });

    console.log(`Success! Tenant ensured for ${twilioNumber}`);
    process.exit(0);
}

run().catch(err => {
    console.error('Failed to upsert tenant:', err);
    process.exit(1);
});
