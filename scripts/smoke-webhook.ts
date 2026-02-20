
import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WEBHOOK_URL = `${BASE_URL}/api/webhook`;

async function smokeTest() {
    console.log('🚀 Starting Smoke Test...');
    console.log(`Target: ${WEBHOOK_URL}`);

    // 1. Initial Greeting (Start Flow)
    // Simulate "frete" message
    // Just validating it doesn't crash and returns 200 XML
    const startResult = await sendWebhook('frete');
    if (!startResult.ok) throw new Error('Failed to start flow');
    console.log('✅ Step 1: Start Flow OK');

    // 2. CEP Provision
    // We need a session, but the webhook is stateful per number. 
    // We'll use a test number.
    const TEST_NUMBER = 'whatsapp:+5511999999999';

    // Note: Since we don't have a real Redis in this script context unless we Mock it or run against real app,
    // we rely on the app being running.

    // Send "frete" again to ensure session/state
    await sendWebhook('frete', TEST_NUMBER);

    // Send CEP
    const cepResult = await sendWebhook('01001000', TEST_NUMBER);
    const cepText = await cepResult.text();
    if (!cepText.includes('quantas unidades')) {
        console.warn('⚠️ Step 2: CEP response might be unexpected:', cepText);
    } else {
        console.log('✅ Step 2: CEP Accepted');
    }

    // Send Quantity
    const qtdResult = await sendWebhook('1', TEST_NUMBER);
    const qtdText = await qtdResult.text();

    if (qtdText.includes('Frete R$')) {
        console.log('✅ Step 3: Freight Quoted!');
        console.log('   Response:', qtdText.substring(0, 100) + '...');
    } else {
        console.error('❌ Step 3 Failed. Response:', qtdText);
        process.exit(1);
    }

    console.log('🎉 Smoke Test Passed!');
}

async function sendWebhook(body: string, from = 'whatsapp:+5511999999999') {
    const params = new URLSearchParams();
    params.append('Body', body);
    params.append('From', from);
    params.append('To', 'whatsapp:+5511888888888'); // System number
    params.append('MessageSid', 'SM' + Math.random().toString(36).substring(7));

    // We are NOT signing, so ensure TWILIO_SIGNATURE_VALIDATION_ENABLED is FALSE locally 
    // OR we strictly test logic that doesn't validate if we can't sign easily.
    // But the requirement says "Simular fluxo". 

    return fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });
}

smokeTest().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
