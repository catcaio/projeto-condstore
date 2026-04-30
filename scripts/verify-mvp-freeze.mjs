import { guardrailAllowlist, hardFrozenSurfaces } from './mvp-freeze-config.mjs';
import { collectChangedFiles } from './git-diff-utils.mjs';

function matchSurface(file) {
  return hardFrozenSurfaces.find((surface) => surface.prefixes.some((prefix) => file.startsWith(prefix)));
}

const baseRef = process.env.MVP_FREEZE_BASE || 'origin/main';
const allowFrozenChanges = process.env.ALLOW_FROZEN_SURFACE_CHANGES === '1';
const { baseRef: resolvedBaseRef, files: changedFiles } = collectChangedFiles(baseRef);
const violations = changedFiles
  .filter((file) => !guardrailAllowlist.has(file))
  .map((file) => ({ file, surface: matchSurface(file) }))
  .filter((entry) => entry.surface);

if (changedFiles.length === 0) {
  const baseLabel = resolvedBaseRef ?? `${baseRef} (indisponível)`;
  console.log(`[guardrail:mvp-freeze] Nenhuma mudança detectada contra ${baseLabel}.`);
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
console.error(`Base usada: ${resolvedBaseRef ?? `${baseRef} (indisponível)`}`);
console.error(lines.join('\n'));
console.error('Use ALLOW_FROZEN_SURFACE_CHANGES=1 apenas quando a tarefa/PR documentar o motivo do unfreeze.');
process.exit(1);
