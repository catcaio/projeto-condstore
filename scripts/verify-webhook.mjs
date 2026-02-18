
// scripts/verify-webhook.mjs
const WEBHOOK_URL = 'http://localhost:3000/api/webhook';

async function testMissingSignature() {
    console.log('Test 1: Missing Signature -> Expect 403');
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ Body: 'Test' }),
        });

        if (response.status === 403) {
            console.log('✅ PASS: Returned 403 Forbidden');
            // Check body
            const data = await response.json().catch(() => ({}));
            console.log('Response body:', data);
        } else {
            console.log(`❌ FAIL: Returned ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log('Response body:', text);
        }
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

testMissingSignature();
