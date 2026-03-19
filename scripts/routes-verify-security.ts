import fs from 'fs';
import path from 'path';

type GuardRule = {
    guards: string[];
    source: string;
};

const APP_DIR = process.env.ROUTES_VERIFY_APP_DIR
    ? path.resolve(process.env.ROUTES_VERIFY_APP_DIR)
    : path.join(process.cwd(), 'src', 'app');

const GUARDED_TOKEN_PATTERNS: Record<string, RegExp> = {
    requireInternalToken: /requireInternalToken\s*\(/,
    requireInternalAuth: /requireInternalAuth\s*\(/,
    requireAdmin: /requireAdmin\s*\(/,
    requireAdminSession: /requireAdminSession\s*\(/,
    requireSession: /requireSession\s*\(/,
    requireSessionTenantMatch: /requireSessionTenantMatch\s*\(/,
    assertDevOnly: /assertDevOnly\s*\(/,
    'x-internal-token': /(?:headers|get|safeCompare)[\s\S]{0,160}['"]x-internal-token['"]/,
    'x-qa-token': /(?:headers|get|safeCompare)[\s\S]{0,160}['"]x-qa-token['"]/,
    'x-bootstrap-token': /(?:headers|get|safeCompare)[\s\S]{0,160}['"]x-bootstrap-token['"]/,
};

// Prefixes that require security guardrails and the guards they accept.
// Prefix rules also apply to future subroutes that follow the same audited patterns.
const PROTECTED_PREFIXES: { prefix: string; guards: string[] }[] = [
    {
        prefix: '/api/internal/',
        guards: [
            'requireInternalToken',
            'requireInternalAuth',
            'requireAdmin',
            'assertDevOnly',
            'x-internal-token',
            'x-qa-token',
            'x-bootstrap-token',
        ],
    },
    {
        prefix: '/api/cockpit/',
        guards: ['requireAdmin'],
    },
    {
        prefix: '/api/tenants/',
        guards: ['requireSessionTenantMatch', 'requireAdminSession', 'requireAdmin', 'requireInternalToken'],
    },
    {
        prefix: '/api/freight/',
        guards: ['requireAdmin'],
    },
    {
        prefix: '/api/sales/quote',
        guards: ['requireAdmin'],
    },
    {
        prefix: '/api/search',
        guards: ['requireSession', 'requireAdminSession', 'requireAdmin'],
    },
    {
        prefix: '/api/notifications',
        guards: ['requireSession', 'requireAdminSession', 'requireAdmin'],
    },
    {
        prefix: '/api/ecosystem/events',
        guards: ['requireSession', 'requireAdminSession', 'requireAdmin'],
    },
];

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

function routeMatchesProtectedPrefix(routePath: string, prefix: string): boolean {
    if (prefix.endsWith('/')) {
        return routePath.startsWith(prefix);
    }

    return routePath === prefix || routePath.startsWith(prefix + '/');
}

function resolveRule(routePath: string): GuardRule | null {
    const prefixRule = PROTECTED_PREFIXES.find(rule => routeMatchesProtectedPrefix(routePath, rule.prefix));
    if (!prefixRule) return null;

    return {
        guards: prefixRule.guards,
        source: `protected prefix \`${prefixRule.prefix}\``,
    };
}

function resolveReExportTarget(filePath: string, content: string): string | null {
    const match = content.match(/export\s*\{[^}]+\}\s*from\s*['"]([^'"]+)['"]/);
    const importPath = match?.[1];
    if (!importPath) return null;

    if (importPath.startsWith('@/')) {
        return path.join(process.cwd(), 'src', importPath.slice(2));
    }

    if (importPath.startsWith('.')) {
        return path.resolve(path.dirname(filePath), importPath);
    }

    return null;
}

function hasAcceptableGuard(filePath: string, guards: string[], visited = new Set<string>()): boolean {
    if (visited.has(filePath) || !fs.existsSync(filePath)) return false;
    visited.add(filePath);

    const content = fs.readFileSync(filePath, 'utf-8');
    if (guards.some(guard => GUARDED_TOKEN_PATTERNS[guard]?.test(content))) {
        return true;
    }

    const reExportTarget = resolveReExportTarget(filePath, content);
    if (!reExportTarget) return false;

    const targetFilePath = reExportTarget.endsWith('.ts') ? reExportTarget : `${reExportTarget}.ts`;
    return hasAcceptableGuard(targetFilePath, guards, visited);
}

function verifyRouteSecurity() {
    console.log('🔒 Verifying security guardrails on protected routes...');

    const allRoutes = findRouteFiles(APP_DIR);
    const violations: string[] = [];

    for (const { routePath, filePath } of allRoutes) {
        const rule = resolveRule(routePath);
        if (!rule) continue;

        const hasGuard = hasAcceptableGuard(filePath, rule.guards);

        if (!hasGuard) {
            violations.push(routePath);
            console.error(`  ❌ SECURITY GUARD MISSING for route: ${routePath}`);
            console.error(`     File: ${path.relative(process.cwd(), filePath)}`);
            console.error(`     Rule source: ${rule.source}`);
            console.error(`     Expected one of: ${rule.guards.join(', ')}`);
        }
    }

    if (violations.length > 0) {
        console.error(`\n🛑 ${violations.length} route(s) missing security guardrails!`);
        console.error('Add the appropriate guard to each route handler before merging.');
        process.exit(1);
    }

    const protectedCount = allRoutes.filter(route => resolveRule(route.routePath)).length;
    console.log(`✅ All ${protectedCount} protected routes have security guardrails.`);
    process.exit(0);
}

verifyRouteSecurity();
