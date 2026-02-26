import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3002;
const BASE_URL = `http://localhost:${PORT}`;
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'condstore_dev_bypass_local_991';

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
    console.log(`[QA] Bootstrapping dev session...`);
    const sessionRes = await fetch(`${BASE_URL}/api/internal/dev/session?token=${INTERNAL_TOKEN}`);
    if (!sessionRes.ok) {
        console.error(`[QA] Failed to bootstrap session! HTTP ${sessionRes.status}`);
        process.exit(1);
    }

    const setCookieHeader = sessionRes.headers.get('set-cookie');
    if (!setCookieHeader) {
        console.error(`[QA] No Set-Cookie header found in session bootstrap!`);
        process.exit(1);
    }

    // Extract the raw cookie without Max-Age, etc. Just the key=value part
    const cookieString = setCookieHeader.split(';')[0];
    const headers = {
        'Cookie': cookieString,
        'Content-Type': 'application/json'
    };

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
                { string: 'transações', description: 'Table Summary text rendered' },
                { string: 'Mostrando', description: 'Summary explicitly checks limits' }
            ]
        },
        {
            name: 'saved_views_api',
            url: `${BASE_URL}/api/cockpit/saved-views?module=audit`,
            asserts: [
                { string: 'QA View', description: 'Server Saved View present in API response' }
            ]
        },
        {
            name: 'acquisition',
            url: `${BASE_URL}/cockpit/acquisition?groupBy=utm_campaign&q=summer&page=2`,
            asserts: [
                { string: 'summer', description: 'Query value reflected in HTML' },
                { string: 'utm_campaign', description: 'Grouping reflected in HTML' },
                { string: 'Mostrando', description: 'DataTable rendering text' }
            ]
        },
        {
            name: 'drilldown',
            url: `${BASE_URL}/cockpit/acquisition/drilldown?groupBy=utm_campaign&utm_campaign=summer_sale`,
            asserts: [
                { string: 'Detalhes de Aquisição', description: 'Drilldown Page Title rendered' },
                { string: 'Mostrando', description: 'Drilldown DataTable rendering text' }
            ]
        }
    ];

    for (const target of targets) {
        console.log(`\n[QA] Testing [${target.name}] at: ${target.url}`);
        try {
            const res = await fetch(target.url, { headers });
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

    if (hasErrors) {
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
