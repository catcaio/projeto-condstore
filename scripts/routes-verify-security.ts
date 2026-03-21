import fs from 'fs';
import path from 'path';

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
    'requireWebhookSignature': /requireWebhookSignature\s*\(/,
    'requireActivePlan': /requireActivePlan\s*\(/,
    'requireKnowledgePermission': /requireKnowledgePermission\s*\(/,
    'admin-token': /process\.env\.ADMIN_TOKEN/,
    'seed-token': /process\.env\.SEED_TOKEN/,
};

// Define strictly what bypasses the guard check entirely (because it relies on different mechanisms like webhook signature or is actually public)
const PUBLIC_PREFIXES = [
    '/api/public/',
    '/api/auth/',
    '/api/webhook',
    '/api/webhooks/',
    '/api/whatsapp/',
    '/api/health',
    '/api/cron/',
    '/api/domine/intake'
];

const DEFAULT_GUARDS = [
    'requireInternalToken',
    'requireInternalAuth',
    'requireAdmin',
    'requireAdminSession',
    'requireSession',
    'requireSessionTenantMatch',
    'assertDevOnly',
    'x-internal-token',
    'x-qa-token',
    'x-bootstrap-token',
    'requireWebhookSignature',
    'requireActivePlan',
    'requireKnowledgePermission',
    'admin-token',
    'seed-token'
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
            // Only care about /api routes in app directory
            if (routePath.startsWith('/api') || routePath === '/api') {
                results.push({ routePath, filePath: fullPath });
            }
        }
    }

    return results;
}

function isPublicRoute(routePath: string): boolean {
    return PUBLIC_PREFIXES.some(prefix => routePath === prefix || routePath.startsWith(prefix.endsWith('/') ? prefix : prefix + '/'));
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

// Function to verify if there's any extraction of tenantId or userId from searchParams or request.json()
// which bypasses secure session extraction.
function hasInsecureInputExtraction(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for searchParams.get('tenantId') or searchParams.get('userId')
    const searchParamsRegex = /\.get\(['"`](tenantId|userId)['"`]\)/;
    const matchSearch = content.match(searchParamsRegex);
    if (matchSearch) {
        if (!filePath.includes('audit\\route.ts') && !filePath.includes('audit/route.ts')) {
            return `Extracts ${matchSearch[1]} from searchParams. Use secure session instead.`;
        }
    }

    // Checking for body extraction of tenantId - this is a crude but effective regex for a warning.
    // It looks for common patterns like const { tenantId } = await request.json()
    const bodyExtractRegex = /(?:const|let|var)\s*\{[^}]*\b(tenantId|userId)\b[^}]*\}\s*=\s*(?:await\s+)?(?:request|req)\.json\(\)/;
    const matchBody = content.match(bodyExtractRegex);
    if (matchBody) {
        return `Extracts ${matchBody[1]} from request body. Use secure session instead.`;
    }

    return null;
}

function verifyRouteSecurity() {
    console.log('🔒 Verifying security guardrails on ALL api routes...');

    // Only get routes in app/api
    const apiDir = path.join(APP_DIR, 'api');
    const allRoutes = findRouteFiles(apiDir, '/api');
    const violations: string[] = [];
    const insecureInputs: string[] = [];
    let protectedCount = 0;

    for (const { routePath, filePath } of allRoutes) {
        if (isPublicRoute(routePath)) {
            continue;
        }

        protectedCount++;
        const hasGuard = hasAcceptableGuard(filePath, DEFAULT_GUARDS);
        const insecureInput = hasInsecureInputExtraction(filePath);

        if (!hasGuard) {
            violations.push(routePath);
            console.error(`[MISSING_GUARD] ${routePath} (${path.relative(process.cwd(), filePath)})`);
        }

        if (insecureInput) {
            if (!routePath.startsWith('/api/internal/')) {
                 insecureInputs.push(routePath);
                 console.error(`[INSECURE_INPUT] ${routePath} (${path.relative(process.cwd(), filePath)}) -> ${insecureInput}`);
            }
        }
    }

    if (violations.length > 0 || insecureInputs.length > 0) {
        console.error(`\n🛑 ${violations.length} route(s) missing security guardrails!`);
        console.error(`🛑 ${insecureInputs.length} route(s) extracting tenantId/userId insecurely!`);
        console.error('Add the appropriate guard and remove insecure inputs before merging.');
        process.exit(1);
    }

    console.log(`✅ All ${protectedCount} protected routes have security guardrails.`);
    console.log(`✅ No protected routes extracting tenantId/userId insecurely via request.`);
    process.exit(0);
}

verifyRouteSecurity();
