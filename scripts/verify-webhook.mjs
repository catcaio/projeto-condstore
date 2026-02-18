
// scripts/verify-webhook.mjs
//
// Smoke tests for /api/webhook.
//
// Run against a local dev server with signature validation DISABLED:
//   TWILIO_SIGNATURE_VALIDATION_ENABLED=false node scripts/verify-webhook.mjs
//
// With signature validation ENABLED (default) only Test 1 is meaningful.

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook';

// Sandbox number seeded in 0002_seed_twilio_sandbox.ts
const SANDBOX_TO = process.env.TWILIO_SANDBOX_TO || 'whatsapp:+14155238886';
const SANDBOX_FROM = 'whatsapp:+5511999000001';

let passed = 0;
let failed = 0;

function result(label, ok, detail) {
    if (ok) {
        console.log(`  PASS  ${label}`);
        passed++;
    } else {
        console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
        failed++;
    }
}

// ──────────────────────────────────────────────────────────────
// Test 1: Missing Twilio signature → 403
// (works regardless of TWILIO_SIGNATURE_VALIDATION_ENABLED value
//  when it is 'true', which is the default)
// ──────────────────────────────────────────────────────────────
async function testMissingSignature() {
    console.log('\nTest 1: Missing signature → 403');
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ Body: 'Test', To: SANDBOX_TO, From: SANDBOX_FROM }),
        });

        if (response.status === 403) {
            const data = await response.json().catch(() => ({}));
            result('Missing signature → 403', true);
            console.log('    body:', data);
        } else {
            const text = await response.text();
            result('Missing signature → 403', false, `got ${response.status}`);
            console.log('    body:', text.slice(0, 200));
        }
    } catch (err) {
        result('Missing signature → 403', false, err.message);
    }
}

// ──────────────────────────────────────────────────────────────
// Test 2: Unknown tenant (no matching To number) → 403
// Requires: TWILIO_SIGNATURE_VALIDATION_ENABLED=false
// ──────────────────────────────────────────────────────────────
async function testUnknownTenant() {
    console.log('\nTest 2: Unknown tenant → 403 (requires sig validation disabled)');
    const sigDisabled = process.env.TWILIO_SIGNATURE_VALIDATION_ENABLED === 'false';
    if (!sigDisabled) {
        console.log('    SKIP  (set TWILIO_SIGNATURE_VALIDATION_ENABLED=false to run this test)');
        return;
    }

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                // Fake signature to bypass validation check
                'x-twilio-signature': 'fake-sig-not-validated',
            },
            body: new URLSearchParams({
                Body: 'oi',
                To: 'whatsapp:+19999999999', // number that doesn't exist in DB
                From: SANDBOX_FROM,
                MessageSid: 'SM_test_unknown_tenant',
            }),
        });

        if (response.status === 403) {
            const data = await response.json().catch(() => ({}));
            result('Unknown tenant → 403', true);
            console.log('    body:', data);
        } else {
            const text = await response.text();
            result('Unknown tenant → 403', false, `got ${response.status}`);
            console.log('    body:', text.slice(0, 200));
        }
    } catch (err) {
        result('Unknown tenant → 403', false, err.message);
    }
}

// ──────────────────────────────────────────────────────────────
// Test 3: Valid request → controller produces TwiML (not generic error)
// Requires:
//   - TWILIO_SIGNATURE_VALIDATION_ENABLED=false
//   - Tenant for SANDBOX_TO exists in DB (seeded by 0002_seed_twilio_sandbox.ts)
//   - DATABASE_URL set for the running server
// ──────────────────────────────────────────────────────────────
async function testValidControllerPath() {
    console.log('\nTest 3: Valid request → TwiML from controller (requires sig validation disabled + seeded tenant)');
    const sigDisabled = process.env.TWILIO_SIGNATURE_VALIDATION_ENABLED === 'false';
    if (!sigDisabled) {
        console.log('    SKIP  (set TWILIO_SIGNATURE_VALIDATION_ENABLED=false to run this test)');
        return;
    }

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-twilio-signature': 'fake-sig-not-validated',
            },
            body: new URLSearchParams({
                Body: 'frete',
                To: SANDBOX_TO,
                From: SANDBOX_FROM,
                MessageSid: `SM_test_controller_${Date.now()}`,
                AccountSid: 'AC_test',
            }),
        });

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        const isTwiML = response.status === 200 && contentType.includes('text/xml') && text.includes('<Response>');
        const isControllerReply = text.includes('<Message>') && !text.includes('Desculpe, ocorreu um erro');

        result('Valid request → 200 TwiML', isTwiML, `status=${response.status} ct=${contentType}`);
        result('Controller reply (not generic error)', isControllerReply);
        console.log('    body:', text.slice(0, 400));
    } catch (err) {
        result('Valid request → TwiML', false, err.message);
    }
}

// ──────────────────────────────────────────────────────────────
async function main() {
    console.log(`\nWebhook smoke tests → ${WEBHOOK_URL}`);
    console.log('─'.repeat(60));

    await testMissingSignature();
    await testUnknownTenant();
    await testValidControllerPath();

    console.log('\n' + '─'.repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

main();
