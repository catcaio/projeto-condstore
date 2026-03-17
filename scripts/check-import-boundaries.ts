// check-import-boundaries.ts
// Lightweight architecture boundary check.
//
// Rules enforced:
//   1. src/app/ must not import modules/X/services/Y directly
//   2. src/app/ must not import modules/X/repositories/Y directly
//   3. src/app/ must not import modules/X/actions/Y directly
//   4. src/app/ must not import modules/X/adapters/Y directly
//   5. Modules must not import internals of other modules
//      (services/, repositories/, actions/, adapters/, tools/,
//       loaders/, components/, __tests__/ of another module)
//   6. infra/ and core/ must not import module internals
//
// Allowed:
//   - @/modules/<name>          (index.ts barrel)
//   - @/modules/<name>/server   (server.ts entrypoint)
//   - @/modules/<name>/types    (public types)
//   - @/modules/<name>/mock-data (mock data - tolerated)
//   - Self-referencing within a module (./relative imports)
//
// Out of scope (requires broader refactor):
//   - src/app/ → @/infra/** (API routes legitimately use infra utilities)
//   - src/app/ → @/modules/X/X.service (flat file imports, no entrypoint yet)
//   - Cross-module flat file imports where no entrypoint exists
//
// Usage:
//   npm run check:boundaries

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..', 'src');

// Matches: from '@/modules/<module>/<internal-directory>/<anything>'
// Covers: services/, repositories/, actions/, adapters/, tools/,
//         loaders/, components/, __tests__/, queries/
const DEEP_IMPORT_RE = /from\s+['"]@\/modules\/([^'"\/]+)\/(services|repositories|actions|adapters|tools|loaders|components|__tests__|queries)\/([^'"]+)['"]/g;

// Matches: from '@/modules/<module>/cache-keys' (specific known deep import)
const KNOWN_DEEP_IMPORTS_RE = /from\s+['"]@\/modules\/([^'"\/]+)\/(cache-keys)['"]/g;

// Files that are known to have deep imports that require refactor (tracked debt).
// Each entry MUST have a TODO(boundary) comment explaining the reason and removal path.
const ALLOWLIST: string[] = [
  // ── frank tools → pedidos/freight repositories ─────────────────────────
  // TODO(boundary): frank tools import pedidos/freight repositories directly.
  // Removal: create @/modules/pedidos/server and @/modules/freight/server entrypoints.
  'src/modules/frank/tools/read-only/getRecentQuotes.tool.ts',
  'src/modules/frank/tools/read-only/getRecentOrders.tool.ts',
  'src/modules/frank/tools/read-only/getOrderStatus.tool.ts',
  'src/modules/frank/tools/read-only/getShipmentStatus.tool.ts',

  // ── atendimento → pedidos internals ────────────────────────────────────
  // TODO(boundary): atendimento orchestrator imports pedidos services/ directory.
  // Removal: create @/modules/pedidos/server entrypoint and re-export needed services.
  'src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts',

  // ── test files (vi.mock paths match regex but are not runtime imports) ─
  // TODO(boundary): vi.mock() paths in test files match the regex pattern.
  // These are not actual runtime imports. Consider excluding __tests__/ from enforcement.
  'src/app/api/webhook/stripe/__tests__/stripe-lifecycle.test.ts',
  'src/app/api/webhook/stripe/__tests__/stripe-gates.test.ts',

  // ── app routes → module internals ──────────────────────────────────────
  // TODO(boundary): routes import module services/adapters/ directories directly.
  // Removal: create server entrypoints for frank and freight modules.
  'src/app/api/cockpit/frank/feed/route.ts',
  'src/app/api/freight/shipments/route.ts',
  'src/app/api/internal/freight/shipments/route.ts',

  // ── UI views → frank server actions ────────────────────────────────────
  // TODO(boundary): cockpit views import frank/actions/review for server actions.
  // Removal: create @/modules/frank entrypoint re-exporting the review action.
  'src/modules/clientes/clients-view.tsx',
  'src/modules/conversas/components/conversation-context.tsx',
  'src/modules/logistica/logistics-view.tsx',
  'src/modules/pedidos/orders-view.tsx',

  // ── UI components cross-module ─────────────────────────────────────────
  // TODO(boundary): UI pages/views import React components from other modules.
  // Removal: create client entrypoints (index.ts) re-exporting public components.
  'src/app/(admin)/cockpit/playbooks/new/page.tsx',
  'src/app/(admin)/cockpit/playbooks/page.tsx',
  'src/app/(admin)/cockpit/playbooks/[id]/page.tsx',
  'src/modules/logistica/components/logistics-customer-context.tsx',
  'src/modules/pedidos/components/order-customer-context.tsx',

  // ── workspace → cockpit components ─────────────────────────────────────
  // TODO(boundary): workspace foundation imports cockpit UI components.
  // Removal: create @/modules/cockpit entrypoint re-exporting shell components.
  'src/modules/workspace/foundation.tsx',
];

interface Violation {
  file: string;
  line: number;
  importPath: string;
  rule: string;
}

function getTypeScriptFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
        walk(fullPath);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function getModuleFromFilePath(filePath: string): string | null {
  const rel = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
  const match = rel.match(/^modules\/([^/]+)\//);
  return match ? match[1] : null;
}

function isInAllowlist(filePath: string): boolean {
  const rel = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
  const srcRel = `src/${rel}`;
  return ALLOWLIST.some(allowed => srcRel === allowed || rel === allowed);
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];

  if (isInAllowlist(filePath)) return violations;

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const rel = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
  const fileModule = getModuleFromFilePath(filePath);
  const isAppLayer = rel.startsWith('app/');
  const isInfraLayer = rel.startsWith('infra/');
  const isCoreLayer = rel.startsWith('core/');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comment lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    // Check deep imports into internal directories of modules
    let match: RegExpExecArray | null;
    DEEP_IMPORT_RE.lastIndex = 0;
    while ((match = DEEP_IMPORT_RE.exec(line)) !== null) {
      const targetModule = match[1];
      const targetLayer = match[2]; // services, repositories, actions, adapters, etc.

      // Self-referencing within same module is OK (but prefer relative imports)
      if (fileModule === targetModule) continue;

      const importPath = match[0].replace(/from\s+['"]/, '').replace(/['"]$/, '');

      if (isAppLayer) {
        violations.push({
          file: `src/${rel}`,
          line: lineNum,
          importPath,
          rule: `app/ must not import @/modules/${targetModule}/${targetLayer}/ directly. Use entrypoint.`,
        });
      } else if (fileModule && fileModule !== targetModule) {
        violations.push({
          file: `src/${rel}`,
          line: lineNum,
          importPath,
          rule: `modules/${fileModule} must not import internals of modules/${targetModule}/${targetLayer}/. Use entrypoint.`,
        });
      } else if (isInfraLayer || isCoreLayer) {
        violations.push({
          file: `src/${rel}`,
          line: lineNum,
          importPath,
          rule: `${isInfraLayer ? 'infra' : 'core'}/ must not import @/modules/${targetModule}/${targetLayer}/ directly. Use entrypoint.`,
        });
      }
    }

    // Check known deep file imports (cache-keys, etc.)
    KNOWN_DEEP_IMPORTS_RE.lastIndex = 0;
    while ((match = KNOWN_DEEP_IMPORTS_RE.exec(line)) !== null) {
      const targetModule = match[1];

      // Self-referencing within same module is OK
      if (fileModule === targetModule) continue;

      const importPath = match[0].replace(/from\s+['"]/, '').replace(/['"]$/, '');

      violations.push({
        file: `src/${rel}`,
        line: lineNum,
        importPath,
        rule: `Must not import @/modules/${targetModule}/${match[2]} directly. Use @/modules/${targetModule} entrypoint.`,
      });
    }
  }

  return violations;
}

function main() {
  console.log('Architecture Import Boundary Check');
  console.log('─'.repeat(60));

  const files = getTypeScriptFiles(SRC_DIR);
  const allViolations: Violation[] = [];

  for (const file of files) {
    const violations = scanFile(file);
    allViolations.push(...violations);
  }

  if (allViolations.length === 0) {
    console.log('PASS: No import boundary violations found.');
    console.log(`   Scanned ${files.length} files.`);
    console.log(`   Allowlisted ${ALLOWLIST.length} files (tracked debt).`);
    process.exit(0);
  }

  console.log(`FAIL: Found ${allViolations.length} violation(s):\n`);

  for (const v of allViolations) {
    console.log(`  ${v.file}:${v.line}`);
    console.log(`    import: ${v.importPath}`);
    console.log(`    rule:   ${v.rule}`);
    console.log();
  }

  console.log('─'.repeat(60));
  console.log(`Scanned ${files.length} files. Allowlisted ${ALLOWLIST.length} files.`);
  console.log('Fix violations by importing from module entrypoints:');
  console.log('  @/modules/<module>          (index.ts)');
  console.log('  @/modules/<module>/server    (server.ts)');
  console.log('  @/modules/<module>/types     (types)');

  process.exit(1);
}

main();
