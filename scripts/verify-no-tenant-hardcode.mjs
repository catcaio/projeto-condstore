/**
 * Guardrail: Verificação de Ausência de IDs de Tenant Hardcoded em Código de Produção (src/)
 *
 * Bloqueia commits ou PRs que introduzam IDs concretos como 'LOJACOND' ou fallbacks
 * default de tenant em código executável sob src/ e scripts operacionais.
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(process.cwd(), 'src');
const SCRIPTS_DIR = path.resolve(process.cwd(), 'scripts');

// Padrões proibidos em código de produção e scripts operacionais
export const FORBIDDEN_PATTERNS = [
  {
    regex: /['"`]LOJACOND['"`]/,
    description: "Hardcoded founder tenant ID 'LOJACOND'",
  },
  {
    regex: /['"`]lojacond-default['"`]/,
    description: "Hardcoded default tenant ID 'lojacond-default'",
  },
  {
    regex: /tenantId\s*===?\s*['"`]LOJACOND['"`]/i,
    description: "Tenant check against hardcoded LOJACOND",
  },
  {
    regex: /tenantId\s*===?\s*['"`]lojacond-default['"`]/i,
    description: "Tenant check against hardcoded lojacond-default",
  },
  {
    regex: /(?:tenantId|\bT)\s*=\s*['"`](?:LOJACOND|lojacond-default)['"`]/,
    description: "Assignment of hardcoded founder tenant ID",
  },
];

// Arquivos ou diretórios isentos da verificação (testes, migrações históricas, fixtures catalog)
export function isExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return (
    normalized.includes('/__tests__/') ||
    normalized.endsWith('.test.ts') ||
    normalized.endsWith('.test.tsx') ||
    normalized.endsWith('.test.mjs') ||
    normalized.includes('/drizzle/migrations/') ||
    normalized.includes('/drizzle/seeds/') ||
    normalized.includes('scripts/seed-catalog.ts') || // fixture catalog original
    normalized.includes('scripts/verify-no-tenant-hardcode.mjs') // guardrail itself
  );
}

export function scanDirectory(dir, patterns = FORBIDDEN_PATTERNS) {
  if (!fs.existsSync(dir)) return [];
  const violations = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      violations.push(...scanDirectory(fullPath, patterns));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      if (isExcluded(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { regex, description } of patterns) {
          if (regex.test(line)) {
            violations.push({
              filePath: path.relative(process.cwd(), fullPath),
              line: i + 1,
              content: line.trim(),
              description,
            });
          }
        }
      }
    }
  }

  return violations;
}

export function runGuardrail() {
  console.log('🔍 Executando guardrail: verify-no-tenant-hardcode em src/ e scripts/...');
  const srcViolations = scanDirectory(SRC_DIR);
  const scriptsViolations = scanDirectory(SCRIPTS_DIR);
  const violations = [...srcViolations, ...scriptsViolations];

  if (violations.length > 0) {
    console.error(`❌ [guardrail:no-tenant-hardcode] FAILED: ${violations.length} ocorrência(s) encontrada(s):`);
    for (const v of violations) {
      console.error(`  - ${v.filePath}:${v.line} [${v.description}] -> "${v.content}"`);
    }
    return false;
  }

  console.log('✅ [guardrail:no-tenant-hardcode] OK: Nenhum tenant concreto hardcoded em código de produção ou scripts.');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('verify-no-tenant-hardcode.mjs')) {
  const ok = runGuardrail();
  if (!ok) process.exit(1);
}
