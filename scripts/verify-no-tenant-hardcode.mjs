/**
 * Guardrail: Verificação de Ausência de IDs de Tenant Hardcoded em Código de Produção (src/)
 *
 * Bloqueia commits ou PRs que introduzam IDs concretos como 'LOJACOND' ou fallbacks
 * default de tenant em código executável sob src/.
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(process.cwd(), 'src');

// Padrões proibidos em código de produção
const FORBIDDEN_PATTERNS = [
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
];

// Arquivos ou diretórios isentos da verificação (testes, migrações históricas, etc.)
function isExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return (
    normalized.includes('/__tests__/') ||
    normalized.endsWith('.test.ts') ||
    normalized.endsWith('.test.tsx') ||
    normalized.includes('/drizzle/migrations/') ||
    normalized.includes('/drizzle/seeds/')
  );
}

function scanDirectory(dir) {
  const violations = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      violations.push(...scanDirectory(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
      if (isExcluded(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { regex, description } of FORBIDDEN_PATTERNS) {
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

function run() {
  console.log('🔍 Executando guardrail: verify-no-tenant-hardcode em src/...');
  const violations = scanDirectory(SRC_DIR);

  if (violations.length > 0) {
    console.error(`❌ [guardrail:no-tenant-hardcode] FAILED: ${violations.length} ocorrência(s) encontrada(s):`);
    for (const v of violations) {
      console.error(`  - ${v.filePath}:${v.line} [${v.description}] -> "${v.content}"`);
    }
    process.exit(1);
  }

  console.log('✅ [guardrail:no-tenant-hardcode] OK: Nenhum tenant concreto hardcoded em código de produção.');
}

run();
