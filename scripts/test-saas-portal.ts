/**
 * Verification script for SaaS portal auth + tenant context.
 *
 * Prerequisites:
 *   1. Migration 0004_add_users_table.sql executed
 *   2. Seed 0003_seed_dev_user.ts executed
 *   3. Dev server running (npm run dev)
 *
 * Run: npx tsx scripts/test-saas-portal.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
    name: string;
    passed: boolean;
    detail: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
    try {
        await fn();
        results.push({ name, passed: true, detail: 'OK' });
        console.log(`  PASS: ${name}`);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, detail: msg });
        console.log(`  FAIL: ${name} - ${msg}`);
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
}

async function run() {
    console.log(`\nTesting SaaS portal at ${BASE_URL}\n`);

    // --- 1. Unauthenticated access should be blocked ---

    await test('GET /api/simulate without auth returns 401', async () => {
        const res = await fetch(`${BASE_URL}/api/simulate`, { redirect: 'manual' });
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('GET /api/history without auth returns 401', async () => {
        const res = await fetch(`${BASE_URL}/api/history`, { redirect: 'manual' });
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('GET /api/metrics/overview without auth returns 401', async () => {
        const res = await fetch(`${BASE_URL}/api/metrics/overview`, { redirect: 'manual' });
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    // --- 2. Webhook should work WITHOUT auth ---

    await test('POST /api/webhook accessible without auth (not 401)', async () => {
        const res = await fetch(`${BASE_URL}/api/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'Body=test&From=whatsapp:+5511999999999&MessageSid=test123',
            redirect: 'manual',
        });
        // Webhook may return 400/403 due to missing Twilio signature, but NOT 401
        assert(res.status !== 401, `Webhook returned 401 - should be public`);
    });

    await test('GET /api/health accessible without auth', async () => {
        const res = await fetch(`${BASE_URL}/api/health`, { redirect: 'manual' });
        assert(res.status !== 401, `Health returned 401 - should be public`);
    });

    // --- 3. Login flow ---

    let sessionCookie = '';

    await test('POST /api/auth/login with valid credentials', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@lojacond.com', password: 'senha123' }),
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);

        const data = await res.json();
        assert(data.success === true, `Login did not succeed: ${JSON.stringify(data)}`);

        const setCookie = res.headers.get('set-cookie');
        assert(!!setCookie, 'No set-cookie header');
        assert(setCookie!.includes('condstore_session'), 'Cookie name missing');
        assert(setCookie!.includes('HttpOnly'), 'Cookie not httpOnly');

        // Extract cookie for subsequent requests
        const match = setCookie!.match(/condstore_session=([^;]+)/);
        assert(!!match, 'Could not extract cookie value');
        sessionCookie = `condstore_session=${match![1]}`;
    });

    await test('POST /api/auth/login with wrong password returns 401', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@lojacond.com', password: 'wrong' }),
        });
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    // --- 4. Authenticated access with tenant isolation ---

    await test('GET /api/history with auth returns data', async () => {
        const res = await fetch(`${BASE_URL}/api/history`, {
            headers: { Cookie: sessionCookie },
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const data = await res.json();
        assert(data.success === true, `History request failed: ${JSON.stringify(data)}`);
    });

    await test('GET /api/metrics/overview with auth returns tenant data', async () => {
        const res = await fetch(`${BASE_URL}/api/metrics/overview`, {
            headers: { Cookie: sessionCookie },
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const data = await res.json();
        assert(data.tenantId === 'lojacond-default', `Wrong tenantId: ${data.tenantId}`);
    });

    // --- 5. Logout ---

    await test('POST /api/auth/logout clears session', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { Cookie: sessionCookie },
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);

        const setCookie = res.headers.get('set-cookie');
        assert(!!setCookie, 'No set-cookie header on logout');
    });

    // --- Summary ---

    console.log('\n--- RESULTS ---');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`Passed: ${passed}/${results.length}`);
    if (failed > 0) {
        console.log(`Failed: ${failed}`);
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.detail}`);
        });
        process.exit(1);
    } else {
        console.log('All tests passed!');
        process.exit(0);
    }
}

run().catch(err => {
    console.error('Test runner failed:', err);
    process.exit(1);
});
