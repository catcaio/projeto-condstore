import crypto from 'crypto';
import type { NextResponse } from 'next/server';

const url = 'https://app.condstoreos.com/api/whatsapp/incoming';
const authToken = process.env.TWILIO_AUTH_TOKEN || '482eb23a3f3e93ac41d7754c59626316';

async function runTest() {
    const params = {
        MessageSid: 'TEST-SID-' + Date.now(),
        AccountSid: 'TEST-ACCOUNT',
        From: 'whatsapp:+5511999999999',
        To: 'whatsapp:+14155238886',
        Body: 'quanto custa carrinho 140 litros'
    };

    const keys = Object.keys(params).sort();
    let data = url;
    for (const key of keys) {
        data += key + params[key as keyof typeof params];
    }

    const signature = crypto.createHmac('sha1', authToken).update(data).digest('base64');
    console.log('Generated Signature:', signature);

    const formBody = new URLSearchParams(params).toString();

    console.log('Sending webhook to:', url);
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Twilio-Signature': signature
        },
        body: formBody
    });

    console.log('Status:', res.status);
    const bodyText = await res.text();
    console.log('Body:', bodyText);
    
    // Now we must verify the DB results using the local app connection
    // We will do this via a separate step depending on the ORM (Drizzle vs Prisma)
}

runTest().catch(console.error);
