import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { spawn } from 'child_process';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3002;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const QA_BOOTSTRAP_TOKEN = process.env.QA_BOOTSTRAP_TOKEN;
if (!QA_BOOTSTRAP_TOKEN) {
    console.error('[QA] FATAL: QA_BOOTSTRAP_TOKEN env var not set. Cannot bootstrap session. Set it via your CI secrets or .env.local for local runs.');
    process.exit(1);
}

const QA_HEADERS = {
    'Content-Type': 'application/json',
    'x-qa-token': QA_BOOTSTRAP_TOKEN,
    'x-github-actions': 'true'
};

async function ensureDir(dirPath: string) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (e: any) {
        if (e.code !== 'EEXIST') throw e;
    }
}

async function runQa() {
    console.log(`[QA] Starting Visual Proof validation on ${BASE_URL}...`);

    const artifactsDir = path.join(__dirname, '..', '.qa', 'artifacts');
    await ensureDir(artifactsDir);

    // 1. Bootstrap dev session bypassing auth
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
    let headersNoPlan: Record<string, string> = { 'Content-Type': 'application/json' };
    let headersNoRole: Record<string, string> = { 'Content-Type': 'application/json' };

    // Always attempt setup if we have a token, the server will block securely if it's production.
    // Ensure we trigger it correctly
    if (true) {
        console.log(`[QA] Running setup...`);
        const setupRes = await fetch(`${BASE_URL}/api/internal/qa/setup`, {
            method: 'POST',
            headers: QA_HEADERS
        });
        if (!setupRes.ok) {
            console.warn(`[QA] Failed to run setup! HTTP ${setupRes.status} (Warning only)`);
        }

        // ── Primary session bootstrap ──────────────────────────────────────────
        console.log(`[QA] Bootstrapping dev session...`);
        const sessionRes = await fetch(`${BASE_URL}/api/internal/qa/bootstrap-session`, {
            method: 'POST',
            headers: QA_HEADERS
        });

        if (!sessionRes.ok) {
            const body = await sessionRes.text();
            console.error(`[QA] Failed to bootstrap session! HTTP ${sessionRes.status}`);
            console.error(`[QA] Response body: ${body}`);
            console.error(`[QA] x-qa-token present: ${!!QA_BOOTSTRAP_TOKEN}`);
            process.exit(1);
        }

        const setCookieHeader = sessionRes.headers.get('set-cookie');
        if (!setCookieHeader) {
            console.error(`[QA] No Set-Cookie header found in session bootstrap!`);
            console.error(`[QA] Response status: ${sessionRes.status}`);
            console.error(`[QA] Response headers: ${JSON.stringify(Object.fromEntries(sessionRes.headers.entries()))}`);
            process.exit(1);
        }

        const cookieString = setCookieHeader.split(';')[0];
        headers['Cookie'] = cookieString;
        console.log(`[QA] Cookie acquired. Session bootstrapped OK.`);

        // ── No-plan session ────────────────────────────────────────────────────
        console.log(`[QA] Bootstrapping no-plan session...`);
        const sessionRes2 = await fetch(`${BASE_URL}/api/internal/qa/bootstrap-session?tenantId=mock-no-plan&role=operator`, {
            method: 'POST',
            headers: QA_HEADERS
        });
        const setCookieHeader2 = sessionRes2.headers.get('set-cookie');
        if (setCookieHeader2) headersNoPlan['Cookie'] = setCookieHeader2.split(';')[0];

        // ── No-role session ────────────────────────────────────────────────────
        console.log(`[QA] Bootstrapping no-role session...`);
        const sessionRes3 = await fetch(`${BASE_URL}/api/internal/qa/bootstrap-session?role=viewer`, {
            method: 'POST',
            headers: QA_HEADERS
        });
        const setCookieHeader3 = sessionRes3.headers.get('set-cookie');
        if (setCookieHeader3) headersNoRole['Cookie'] = setCookieHeader3.split(';')[0];
    } else {
        console.log(`[QA] Skipping dev session bootstrap (not CI and not Dev)`);
    }

    // 1.5 Create a Saved View via API (QA View)
    console.log(`[QA] Creating Server Saved View...`);
    const createViewRes = await fetch(`${BASE_URL}/api/cockpit/saved-views`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            module: 'audit',
            name: 'QA View',
            filters: { status: 'success' }
        })
    });

    if (!createViewRes.ok) {
        console.warn(`[QA] Failed to create saved view, moving on with fallback... HTTP ${createViewRes.status}`);
    } else {
        console.log(`[QA] Server Saved View created successfully`);
    }

    let hasErrors = false;

    // 2. Test Targets
    const targets = [
        {
            name: 'audit',
            url: `${BASE_URL}/cockpit/audit?status=success&page=2`,
            asserts: [
                { string: 'Audit Logs', description: 'PageHeader Title rendered' },
                { string: 'Eventos do Sistema', description: 'Table Summary text rendered' }
            ]
        },
        {
            name: 'acquisition',
            url: `${BASE_URL}/cockpit/acquisition?groupBy=utm_campaign&q=summer&page=2`,
            asserts: [
                { string: 'Acquisition (UTM)', description: 'PageHeader Title rendered' },
                { string: 'summer', description: 'Query value reflected in HTML' },
                { string: 'utm_campaign', description: 'Grouping reflected in HTML' },
                { string: 'Mostrando', description: 'DataTable rendering text' }
            ]
        },
        {
            name: 'drilldown',
            url: `${BASE_URL}/cockpit/acquisition/drilldown?groupBy=utm_campaign&utm_campaign=summer_sale`,
            headers: headers,
            asserts: [
                { string: 'Detalhes de Aquisição', description: 'Drilldown Page Title rendered' },
                { string: 'Mostrando', description: 'Drilldown DataTable rendering text' }
            ]
        },
        {
            name: 'acquisition_no_plan',
            url: `${BASE_URL}/cockpit/acquisition`,
            headers: headersNoPlan,
            asserts: [
                { string: 'Plano necessário', description: 'Access Gate Block Rendered for missing plan' }
            ]
        },
        {
            name: 'audit_no_role',
            url: `${BASE_URL}/cockpit/audit`,
            headers: headersNoRole,
            asserts: [
                { string: 'Sem permissão', description: 'Access Gate Block Rendered for insufficient role' }
            ]
        },
        {
            name: 'acquisition_error',
            url: `${BASE_URL}/cockpit/acquisition?groupBy=UNSUPPORTED_GROUPING`,
            headers: headers,
            asserts: [
                { string: 'Erro ao carregar', description: 'Server Error State Rendered for failed fetch' }
            ]
        },
        {
            name: 'home',
            url: `${BASE_URL}/`,
            headers: {},
            asserts: [
                { string: 'Automatize o frete da sua loja em', description: 'Public Hero Title rendered' },
                { string: 'Começar agora', description: 'Public primary CTA rendered' }
            ]
        },
        {
            name: 'docs',
            url: `${BASE_URL}/docs`,
            headers: {},
            asserts: [
                { string: 'Documentação', description: 'Public Docs heading rendered' },
                { string: 'Integração simplificada', description: 'Public Docs content rendered' }
            ]
        },
        {
            name: 'pricing',
            url: `${BASE_URL}/pricing`,
            headers: {},
            asserts: [
                { string: 'Planos simples e flexíveis', description: 'Pricing header rendered' },
                { string: 'R$ 0', description: 'Pricing card rendered' }
            ]
        }
    ];

    for (const target of targets) {
        console.log(`\n[QA] Testing [${target.name}] at: ${target.url}`);
        try {
            const currentHeaders = target.headers || headers;
            const res = await fetch(target.url, { headers: currentHeaders });
            const html = await res.text();

            // Save html snapshot
            const filePath = path.join(artifactsDir, `${target.name}.html`);
            await fs.writeFile(filePath, html, 'utf-8');
            console.log(`[QA] Saved snapshot to: .qa/artifacts/${target.name}.html`);

            // Extract DOM proof
            let passedAssertions = 0;
            for (const assert of target.asserts) {
                if (html.includes(assert.string)) {
                    console.log(`  ✅ Assert OK: ${assert.description} (found "${assert.string}")`);
                    passedAssertions++;
                } else {
                    console.error(`  ❌ Assert FAIL: ${assert.description} (missing "${assert.string}")`);
                    hasErrors = true;
                }
            }

            if (passedAssertions === target.asserts.length) {
                console.log(`[QA] ${target.name} Validation Passed!`);
            } else {
                console.error(`[QA] ${target.name} Validation Failed!`);
            }
        } catch (e: any) {
            console.error(`[QA] ERROR requesting ${target.name}:`, e.message);
            hasErrors = true;
        }
    }

    // 3. Prod-safety test (run Next.js in production mode and expect 403 on dev endpoint)
    let prodSafetyOk = false;
    console.log(`\n[QA] Running PROD-SAFETY test...`);

    try {
        const prodSafetyPromise = new Promise<void>((resolve, reject) => {
            const prodPort = '3016'; // avoid conflicts with 3015
            const cmdStr = process.platform === 'win32' ? 'npx.cmd' : 'npx';
            const nextStart = spawn(cmdStr, ['next', 'start', '-p', prodPort], {
                env: { ...process.env, NODE_ENV: 'production', VERCEL_ENV: 'production', PORT: prodPort },
                stdio: 'pipe',
                shell: process.platform === 'win32'
            });

            let isResolved = false;

            nextStart.stdout.on('data', async (data) => {
                const out = data.toString();
                console.log('[NEXT STDOUT]', out);
                if (!isResolved && (out.includes('Ready in') || out.includes('ready on'))) {
                    isResolved = true;
                    try {
                        await new Promise(r => setTimeout(r, 1000)); // wait for server to fully bind
                        const res = await fetch(`http://localhost:${prodPort}/api/internal/qa/bootstrap-session`, { method: 'POST' });
                        const html = await res.text();
                        await fs.writeFile(path.join(artifactsDir, 'prod_safety.html'), html, 'utf-8');
                        if (res.status === 401 || res.status === 403) {
                            console.log(`[QA] PROD-SAFETY: OK. Dev session returned ${res.status} in production.`);
                            resolve();
                        } else {
                            reject(new Error(`PROD-SAFETY FAIL: Expected 401 or 403, got ${res.status}`));
                        }
                    } catch (err) {
                        reject(err);
                    } finally {
                        nextStart.kill();
                    }
                }
            });

            nextStart.stderr.on('data', (data) => {
                const out = data.toString();
                console.error('[NEXT STDERR]', out);
                if (!isResolved && (out.includes('ready on') || out.includes('Ready in'))) {
                    isResolved = true;
                    setTimeout(() => {
                        fetch(`http://localhost:${prodPort}/api/internal/qa/bootstrap-session`, { method: 'POST' })
                            .then(async res => {
                                const html = await res.text();
                                await fs.writeFile(path.join(artifactsDir, 'prod_safety.html'), html, 'utf-8');
                                if (res.status === 401 || res.status === 403) {
                                    console.log(`[QA] PROD-SAFETY: OK. Dev session returned ${res.status} in production.`);
                                    resolve();
                                } else {
                                    reject(new Error(`PROD-SAFETY FAIL: Expected 401 or 403, got ${res.status}`));
                                }
                            })
                            .catch(reject)
                            .finally(() => nextStart.kill());
                    }, 1000);
                }
            });

            setTimeout(() => {
                if (!isResolved) {
                    nextStart.kill();
                    reject(new Error('PROD-SAFETY FAIL: Server did not start in time.'));
                }
            }, 60000); // 60 seconds
        });

        await prodSafetyPromise;
        prodSafetyOk = true;
    } catch (e: any) {
        console.error(`[QA] PROD-SAFETY test failed: ${e.message}`);
        hasErrors = true;
    }

    if (hasErrors || !prodSafetyOk) {
        console.error(`\n[QA] 🛑 Visual Proof Validation FAILED!`);
        process.exit(1);
    } else {
        console.log(`\n[QA] 🚀 Visual Proof Validation SUCCESSFUL!`);
        process.exit(0);
    }
}

runQa().catch(e => {
    console.error(`[QA] Fatal UI test error:`, e);
    process.exit(1);
});
