import fs from 'fs';
import path from 'path';

const APP_DIR = path.join(process.cwd(), 'src', 'app');

// Prefixes that require security guardrails and the guards they accept
const PROTECTED_PREFIXES: { prefix: string; guards: string[] }[] = [
    {
        prefix: '/api/internal/',
        guards: [
            'requireInternalToken',
            'requireAdmin',
            'assertDevOnly',
            'x-internal-token',
            'x-qa-token',
            'x-bootstrap-token',
        ],
    },
    {
        prefix: '/api/cockpit/',
        guards: ['requireAdmin', 'requireInternalToken'],
    },
    {
        prefix: '/api/tenants/',
        guards: ['requireSessionTenantMatch', 'requireAdmin', 'requireInternalToken'],
    },
];

/**
 * Recursively find all route.ts files under src/app,
 * returning pairs of [routePath, absoluteFilePath].
 */
function findRouteFiles(dir: string, baseRoute: string = ''): { routePath: string; filePath: string }[] {
    const results: { routePath: string; filePath: string }[] = [];
    if (!fs.existsSync(dir)) return results;

    for (const entry of fs.readdirSync(dir)) {
        if (entry.startsWith('_') || entry === 'components' || entry === 'ui' || entry === 'lib') continue;
        if (entry === '__tests__' || entry === 'node_modules') continue;

        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            const isRouteGroup = entry.startsWith('(') && entry.endsWith(')');
            const nextBase = isRouteGroup ? baseRoute : `${baseRoute}/${entry}`;
            results.push(...findRouteFiles(fullPath, nextBase));
        } else if (entry === 'route.ts') {
            const routePath = baseRoute === '' ? '/' : baseRoute;
            results.push({ routePath, filePath: fullPath });
        }
    }

    return results;
}

function verifyRouteSecurity() {
    console.log('🔒 Verifying security guardrails on protected routes...');

    const allRoutes = findRouteFiles(APP_DIR);
    const violations: string[] = [];

    for (const { routePath, filePath } of allRoutes) {
        // Check if this route falls under a protected prefix
        const rule = PROTECTED_PREFIXES.find(p => routePath.startsWith(p.prefix));
        if (!rule) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const hasGuard = rule.guards.some(guard => content.includes(guard));

        if (!hasGuard) {
            violations.push(routePath);
            console.error(`  ❌ SECURITY GUARD MISSING for route: ${routePath}`);
            console.error(`     File: ${path.relative(process.cwd(), filePath)}`);
            console.error(`     Expected one of: ${rule.guards.join(', ')}`);
        }
    }

    if (violations.length > 0) {
        console.error(`\n🛑 ${violations.length} route(s) missing security guardrails!`);
        console.error('Add the appropriate guard to each route handler before merging.');
        process.exit(1);
    }

    const protectedCount = allRoutes.filter(r => PROTECTED_PREFIXES.some(p => r.routePath.startsWith(p.prefix))).length;
    console.log(`✅ All ${protectedCount} protected routes have security guardrails.`);
    process.exit(0);
}

verifyRouteSecurity();
