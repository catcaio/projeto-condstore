import { execFileSync } from 'node:child_process';
import { guardrailAllowlist, hardFrozenSurfaces } from './mvp-freeze-config.mjs';

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function collectChangedFiles(baseRef) {
  const buckets = [
    runGit(['diff', '--name-only', '--diff-filter=ACMR', `${baseRef}...HEAD`]),
    runGit(['diff', '--name-only', '--diff-filter=ACMR']),
    runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']),
    runGit(['ls-files', '--others', '--exclude-standard']),
  ];

  return [...new Set(
    buckets
      .flatMap((output) => output.split(/\r?\n/))
      .map((file) => file.trim())
      .filter(Boolean),
  )];
}

function matchSurface(file) {
  return hardFrozenSurfaces.find((surface) => surface.prefixes.some((prefix) => file.startsWith(prefix)));
}

const baseRef = process.env.MVP_FREEZE_BASE || 'origin/main';
const allowFrozenChanges = process.env.ALLOW_FROZEN_SURFACE_CHANGES === '1';
const changedFiles = collectChangedFiles(baseRef);
const violations = changedFiles
  .filter((file) => !guardrailAllowlist.has(file))
  .map((file) => ({ file, surface: matchSurface(file) }))
  .filter((entry) => entry.surface);

if (changedFiles.length === 0) {
  console.log(`[guardrail:mvp-freeze] Nenhuma mudança detectada contra ${baseRef}.`);
  process.exit(0);
}

if (violations.length === 0) {
  console.log(`[guardrail:mvp-freeze] OK. Nenhuma superfície hard-frozen alterada em ${changedFiles.length} arquivo(s).`);
  process.exit(0);
}

const lines = violations.map(({ file, surface }) => `- ${file} -> ${surface.label}`);

if (allowFrozenChanges) {
  console.warn('[guardrail:mvp-freeze] BYPASS ativo via ALLOW_FROZEN_SURFACE_CHANGES=1.');
  console.warn(lines.join('\n'));
  process.exit(0);
}

console.error('[guardrail:mvp-freeze] Falha: a branch alterou superfícies congeladas sem opt-in explícito.');
console.error(`Base usada: ${baseRef}`);
console.error(lines.join('\n'));
console.error('Use ALLOW_FROZEN_SURFACE_CHANGES=1 apenas quando a tarefa/PR documentar o motivo do unfreeze.');
process.exit(1);
