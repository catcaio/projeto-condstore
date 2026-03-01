import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiDir = path.resolve('c:/repos/projeto-condstore/src/app/api');

function getAllRoutes(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.resolve(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllRoutes(fullPath));
        } else if (file === 'route.ts') {
            results.push(fullPath);
        }
    }
    return results;
}

const routes = getAllRoutes(apiDir);
console.log(`Analyzing ${routes.length} routes...`);

let report = [];

for (const route of routes) {
    const content = fs.readFileSync(route, 'utf-8');
    const relPath = path.relative('c:/repos/projeto-condstore/src/app/api', route).replace(/\\/g, '/');

    let guards = [];
    if (content.includes('requireSessionTenantMatch')) guards.push('requireSessionTenantMatch');
    if (content.match(/requireAdmin\(/)) guards.push('requireAdmin');
    if (content.match(/requireSession\(/)) guards.push('requireSession');
    if (content.includes('INTERNAL_TOKEN')) guards.push('INTERNAL_TOKEN');
    if (content.includes('QA_BOOTSTRAP_TOKEN')) guards.push('QA_BOOTSTRAP_TOKEN');
    if (content.includes('isInternalTokenAuthorized')) guards.push('isInternalTokenAuthorized');
    if (content.includes('requireInternalToken')) guards.push('requireInternalToken');
    if (content.includes('x-webhook-signature')) guards.push('WebhookSignature');

    let status = 'OK';
    if (guards.length === 0) {
        status = 'NO_GUARD';
        if (relPath.includes('webhook') || relPath.includes('public') || relPath.includes('auth/')) {
            status = 'NO_GUARD (EXPECTED_PUBLIC?)';
        }
    }

    // Check if it's an admin route
    let isAdminRoute = relPath.startsWith('internal/') || relPath.startsWith('cockpit/') || relPath.includes('admin') || relPath.startsWith('ops/');

    // An internal route must check INTERNAL_TOKEN or isInternalTokenAuthorized or requireInternalToken
    if (relPath.startsWith('internal/') && !guards.includes('INTERNAL_TOKEN') && !guards.includes('QA_BOOTSTRAP_TOKEN') && !guards.includes('isInternalTokenAuthorized') && !guards.includes('requireInternalToken')) {
        status = 'INTERNAL_WITHOUT_TOKEN';
    }

    if (relPath.startsWith('cockpit/') && !guards.includes('requireAdmin')) {
        status = 'COCKPIT_WITHOUT_ADMIN';
    }

    report.push({
        path: relPath,
        guards: guards.join(', ') || 'NONE',
        status
    });
}

// Generate MD report
let md = `# RBAC Audit Report

| Route | Guards | Status |
|---|---|---|
`;

for (const r of report) {
    md += `| ${r.path} | ${r.guards} | ${r.status} |\n`;
}

fs.writeFileSync('c:/repos/projeto-condstore/rbac-audit.md', md);
console.log('Report saved to rbac-audit.md');
