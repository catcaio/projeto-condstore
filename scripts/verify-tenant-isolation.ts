/**
 * verify-tenant-isolation.ts — AST-based tenant isolation regression gate.
 *
 * Why AST and not grep: a naive `tenantId` grep produces false positives
 * (comments, unrelated identifiers) and false negatives (a `.where()` that
 * mentions tenantId of the WRONG table, or no `.where()` at all). This script
 * parses real TypeScript ASTs and checks, per query chain, that:
 *
 *   1. The target table (from `.from(T)` / `.update(T)` / `.delete(T)`) is known.
 *   2. If that table has a `tenantId` column in src/drizzle/schema.ts, at least
 *      one `.where(...)` in the same chain references a tenant binding
 *      (`*.tenantId`, the `tenantId` identifier, or the `tenant_id` literal in
 *      raw `sql`` fragments), including one level of `const conditions = [...]`
 *      indirection and `withTenantNotDeleted/withTenantIdNotDeleted` helpers.
 *   3. UPDATE/DELETE chains on tenant-scoped tables always carry `.where()`.
 *
 * Documented exceptions (global/system tables, token-capability lookups,
 * internal-gated auth flows) live in ALLOWLIST with a reason each — a new
 * unlisted gap fails the gate (exit 1).
 *
 * Usage: npm run verify:tenant-isolation
 */
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

const REPO_ROOT = process.cwd();
const SCHEMA_FILE = path.join(REPO_ROOT, 'src', 'drizzle', 'schema.ts');

interface TableInfo {
    name: string;
    hasTenantId: boolean;
}

interface AllowEntry {
    fileSuffix: string;
    table: string;
    reason: string;
}

// Documented exceptions — each is a conscious, reviewed decision (see
// docs/tenant-isolation-contract.md § "Exceções documentadas").
const ALLOWLIST: AllowEntry[] = [
    {
        fileSuffix: 'infra/repositories/project-report.repository.ts',
        table: 'projectReports',
        reason: 'project_reports has no tenant_id column by design (internal module/engineering reports, no tenant business data).',
    },
    {
        fileSuffix: 'infra/repositories/webhook-event.repository.ts',
        table: 'webhookEvents',
        reason: 'webhook_events has no tenant_id column by design (provider/eventId dedup + integrity log, no PII).',
    },
    {
        fileSuffix: 'infra/repositories/public-events.repository.ts',
        table: 'publicEvents',
        reason: 'public_events.tenant_id is nullable by design (pre-identity public telemetry); repository is insert-only.',
    },
    {
        fileSuffix: 'infra/repositories/attribution-click.repository.ts',
        table: 'attributionClicks',
        reason: 'Token-capability lookups (getByToken/consumeByToken/upsertByToken): the random token IS the authorization secret minted pre-resolution; tenant_id nullable by design.',
    },
    {
        fileSuffix: 'infra/repositories/tenant.repository.ts',
        table: 'tenants',
        reason: 'tenants is the system root (it IS the tenant); lookups by unique twilio_number/id. getAllTenants is dev-only (assertDevOnly route).',
    },
    {
        fileSuffix: 'infra/repositories/user.repository.ts',
        table: 'users',
        reason: 'Auth-plane lookups by globally-unique email (pre-tenant login) and by JWT sub (self read); password UPDATE is internal-token-gated (reset-admin, non-prod). No tenant-scoped request path reaches these unfiltered.',
    },
    {
        fileSuffix: 'modules/freight/shipment-linkage.repository.ts',
        table: 'freightShipments',
        reason: 'findFreightShipmentByExternalShipmentId resolves by globally-unique external_shipment_id for the signature-verified Melhor Envio webhook; all subsequent writes re-scope via shipment.tenantId.',
    },
    {
        fileSuffix: 'modules/atendimento/conversation.repository.ts',
        table: 'conversationMessages',
        reason: 'getConversationMessageByProviderMessageId resolves by globally-unique provider_message_id for the Twilio status webhook; updates re-scope via the resolved row tenantId.',
    },
    {
        fileSuffix: 'modules/frank/workers/frank-worker.ts',
        table: 'incomingMessages',
        reason: 'Control-plane poller: claims unprocessed rows globally, then processes each message under its own msg.tenantId.',
    },
];

// ─── Schema parsing ──────────────────────────────────────────────────────────

function parseSchemaTables(): Map<string, TableInfo> {
    const source = ts.createSourceFile(SCHEMA_FILE, fs.readFileSync(SCHEMA_FILE, 'utf8'), ts.ScriptTarget.Latest, true);
    const tables = new Map<string, TableInfo>();

    function visit(node: ts.Node) {
        if (ts.isVariableStatement(node)) {
            for (const decl of node.declarationList.declarations) {
                if (!ts.isIdentifier(decl.name) || !decl.initializer || !ts.isCallExpression(decl.initializer)) continue;
                const callee = decl.initializer.expression;
                const calleeName = ts.isIdentifier(callee) ? callee.text : '';
                if (calleeName !== 'mysqlTable') continue;
                const tableVar = decl.name.text;
                const bodyText = decl.initializer.arguments.length > 1 ? decl.initializer.arguments[1].getText(source) : '';
                tables.set(tableVar, { name: tableVar, hasTenantId: /tenantId\s*:/.test(bodyText) });
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    return tables;
}

// ─── Query-chain analysis ────────────────────────────────────────────────────

const CHAIN_STARTS = new Set(['select', 'update', 'insert', 'delete', 'execute']);
const TERMINAL_OPS = new Set(['select', 'update', 'delete']);

interface ChainFinding {
    table: string | null;
    op: 'select' | 'update' | 'delete' | 'other';
    hasWhere: boolean;
    whereHasTenant: boolean;
    line: number;
}

function collectConstArrays(source: ts.SourceFile): Map<string, ts.Expression[]> {
    // Maps `const X = [a, b]` / `const X = conds` initializers for one-level resolution.
    const map = new Map<string, ts.Expression[]>();
    function visit(node: ts.Node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
            if (ts.isArrayLiteralExpression(node.initializer)) {
                map.set(node.name.text, [...node.initializer.elements]);
            } else if (ts.isCallExpression(node.initializer)) {
                map.set(node.name.text, [...node.initializer.arguments]);
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    return map;
}

function whereSubtreeHasTenant(expr: ts.Expression, constArrays: Map<string, ts.Expression[]>, depth = 0): boolean {
    if (depth > 10) return false;
    if (ts.isIdentifier(expr)) {
        if (expr.text === 'tenantId' || expr.text === 'tenant_id') return true;
        const resolved = constArrays.get(expr.text);
        if (resolved) return resolved.some((e) => whereSubtreeHasTenant(e, constArrays, depth + 1));
        return false;
    }
    if (ts.isPropertyAccessExpression(expr)) {
        if (expr.name.text === 'tenantId' || expr.name.text === 'tenant_id') return true;
        return whereSubtreeHasTenant(expr.expression, constArrays, depth + 1);
    }
    if (ts.isStringLiteralLike(expr)) {
        return /tenant_id/i.test(expr.text);
    }
    if (ts.isSpreadElement(expr) || ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr)) {
        return whereSubtreeHasTenant(expr.expression, constArrays, depth + 1);
    }
    if (ts.isCallExpression(expr) || ts.isArrayLiteralExpression(expr)) {
        const args = ts.isCallExpression(expr) ? [...expr.arguments] : [...expr.elements];
        if (ts.isCallExpression(expr) && ts.isPropertyAccessExpression(expr.expression)) {
            // include the callee object (e.g. `withTenantNotDeleted(table, tenantId, …)` args cover it)
        }
        return args.some((a) => whereSubtreeHasTenant(a, constArrays, depth + 1));
    }
    // Fallback: recurse into every child node (not just Expressions — e.g.
    // `${col}` interpolations live inside TemplateSpan nodes, which are not
    // Expressions themselves). forEachChild only visits direct children, so
    // this cannot loop.
    let found = false;
    ts.forEachChild(expr, (child) => {
        if (!found) found = nodeHasTenant(child, constArrays, depth + 1);
    });
    return found;
}

function nodeHasTenant(node: ts.Node, constArrays: Map<string, ts.Expression[]>, depth: number): boolean {
    if (ts.isExpression(node)) return whereSubtreeHasTenant(node, constArrays, depth);
    let found = false;
    ts.forEachChild(node, (child) => {
        if (!found) found = nodeHasTenant(child, constArrays, depth);
    });
    return found;
}

function analyzeFile(filePath: string, tables: Map<string, TableInfo>): ChainFinding[] {
    const source = ts.createSourceFile(filePath, fs.readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);
    const constArrays = collectConstArrays(source);
    const findings: ChainFinding[] = [];

    function chainTableAndWheres(startCall: ts.CallExpression): { table: string | null; wheres: ts.Expression[]; op: ChainFinding['op'] } {
        let table: string | null = null;
        const wheres: ts.Expression[] = [];
        let op: ChainFinding['op'] = 'other';
        // Walk up the fluent chain from the start call.
        let current: ts.Node = startCall;
        // First: the start call itself determines op + table arg.
        const startProp = ts.isPropertyAccessExpression(startCall.expression) ? startCall.expression.name.text : '';
        if (startProp === 'select' || startProp === 'update' || startProp === 'delete') op = startProp;
        if ((startProp === 'update' || startProp === 'delete' || startProp === 'insert') && startCall.arguments.length > 0) {
            const t = startCall.arguments[0];
            if (ts.isIdentifier(t)) table = t.text;
        }
        let parent = current.parent;
        const seen = new Set<ts.Node>();
        while (parent && !seen.has(parent)) {
            seen.add(parent);
            if (ts.isPropertyAccessExpression(parent) && parent.parent && ts.isCallExpression(parent.parent)) {
                const call = parent.parent;
                const method = parent.name.text;
                if (method === 'from' && call.arguments.length > 0 && ts.isIdentifier(call.arguments[0])) {
                    table = call.arguments[0].text;
                }
                if (method === 'where' && call.arguments.length > 0) {
                    wheres.push(call.arguments[0]);
                }
                parent = call.parent;
                continue;
            }
            if (ts.isCallExpression(parent) || ts.isAwaitExpression(parent) || ts.isVariableDeclaration(parent) || ts.isExpressionStatement(parent) || ts.isReturnStatement(parent) || ts.isParenthesizedExpression(parent)) {
                parent = parent.parent;
                continue;
            }
            break;
        }
        return { table, wheres, op };
    }

    function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            const method = node.expression.name.text;
            if (CHAIN_STARTS.has(method)) {
                const { table, wheres, op } = chainTableAndWheres(node);
                // Only record terminal read/write chains with a resolvable table.
                if ((op === 'select' || op === 'update' || op === 'delete') && table) {
                    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
                    findings.push({
                        table,
                        op,
                        hasWhere: wheres.length > 0,
                        whereHasTenant: wheres.some((w) => whereSubtreeHasTenant(w, constArrays)),
                        line,
                    });
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    return findings;
}

// ─── File discovery ──────────────────────────────────────────────────────────

function listFiles(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) listFiles(full, out);
        else if (entry.isFile() && entry.name.endsWith('.repository.ts')) out.push(full);
    }
    return out;
}

function main() {
    const tables = parseSchemaTables();
    const repoDirs = [
        path.join(REPO_ROOT, 'src', 'infra', 'repositories'),
        path.join(REPO_ROOT, 'src', 'modules'),
        path.join(REPO_ROOT, 'src', 'infra', 'frank'),
    ];
    const files = repoDirs.filter((d) => fs.existsSync(d)).flatMap((d) => listFiles(d));
    // Route files with direct db access (the two fixed IDOR sites) are covered too.
    const extraFiles = [
        'src/app/api/tenants/[tenantId]/domine/actions/route.ts',
    ].map((f) => path.join(REPO_ROOT, f)).filter((f) => fs.existsSync(f));

    const violations: string[] = [];
    const acknowledged: string[] = [];
    let checked = 0;

    for (const file of [...files, ...extraFiles]) {
        const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
        const findings = analyzeFile(file, tables);
        for (const f of findings) {
            const info = tables.get(f.table ?? '');
            if (!info || !info.hasTenantId) continue; // global table or unresolvable — out of scope
            checked++;
            const isAllowed = ALLOWLIST.some((a) => rel.endsWith(a.fileSuffix) && a.table === f.table);
            const label = `${rel}:${f.line} [${f.op} ${f.table}]`;
            if ((!f.hasWhere && (f.op === 'update' || f.op === 'delete')) || (f.hasWhere && !f.whereHasTenant)) {
                if (isAllowed) {
                    acknowledged.push(`${label} — allowed: ${ALLOWLIST.find((a) => rel.endsWith(a.fileSuffix) && a.table === f.table)?.reason}`);
                } else {
                    violations.push(`${label} — ${f.op.toUpperCase()} on tenant-scoped table without tenantId in WHERE`);
                }
            } else if (!f.hasWhere && f.op === 'select') {
                // SELECT without WHERE on a tenant-scoped table is only acceptable
                // when explicitly allowlisted (e.g. control-plane pollers).
                if (isAllowed) {
                    acknowledged.push(`${label} — allowed: ${ALLOWLIST.find((a) => rel.endsWith(a.fileSuffix) && a.table === f.table)?.reason}`);
                } else {
                    violations.push(`${label} — SELECT on tenant-scoped table without WHERE (no tenant scope)`);
                }
            }
        }
    }

    console.log(`tenant-isolation gate: ${checked} tenant-scoped query chains checked in ${files.length + extraFiles.length} files.`);
    for (const a of acknowledged) console.log(`  [ACK] ${a}`);

    if (violations.length > 0) {
        console.error(`\n${violations.length} tenant-isolation violation(s):`);
        for (const v of violations) console.error(`  [FAIL] ${v}`);
        console.error('\nScope every query on a tenant-scoped table by tenantId, or document the exception in ALLOWLIST with a reason.');
        process.exit(1);
    }
    console.log('OK — no unlisted tenant-isolation gaps.');
}

main();
