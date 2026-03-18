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

// ── Architectural Allowlist ──────────────────────────────────────────────
// Files that are known to have deep imports that require refactor (tracked debt).
// Each entry MUST have a TODO(boundary) comment explaining the reason and removal path.
//
// STATUS: ✅ EMPTY — All deep-import violations have been resolved.
//
// Previous debt eliminated across PRs #141–#146:
//   - frank tools → pedidos/freight repositories  → resolved via server entrypoints
//   - atendimento → pedidos services              → resolved via server entrypoints
//   - app routes → freight adapters               → resolved via server entrypoints
//   - UI views → frank actions                    → resolved via client entrypoints
//   - cockpit pages → governance/playbooks        → resolved via client entrypoints
//   - module views → clientes components          → resolved via client entrypoints
//   - workspace → cockpit components              → resolved via client entrypoints
//   - test files (vi.mock)                        → stale entries, scanner now skips vi.mock()
//
const ALLOWLIST: string[] = [];

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

    // Skip vi.mock() / jest.mock() lines — these are test-time path references, not runtime imports
    if (/\b(vi|jest)\.mock\s*\(/.test(trimmed)) continue;

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
    if (ALLOWLIST.length > 0) {
      console.log(`   Allowlisted ${ALLOWLIST.length} files (tracked debt).`);
    } else {
      console.log('   Allowlist is EMPTY — architectural shield is fully active. 🛡️');
    }
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
