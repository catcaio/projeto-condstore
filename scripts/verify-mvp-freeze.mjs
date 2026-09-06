/**
 * MVP Baseline guardrail (conversão arquitetural do antigo "MVP Freeze").
 *
 * Conceito vigente: MVP Freeze → MVP Baseline.
 *
 * - Superfícies do baseline (`baselineSurfaces`): toques são MUDANÇAS
 *   INTENCIONAIS PERMITIDAS. O guardrail apenas as REPORTA em voz alta
 *   (advisory) para detectar regressão acidental e quebra de contrato.
 *   Desenvolvimento normal NÃO é bloqueado — este script retorna exit 0
 *   para mudanças exclusivamente de produto.
 * - Security invariants (`securityInvariantGates`): OBRIGATÓRIOS e
 *   BLOQUEANTES. Qualquer falha (ou erro ao executar o gate) = exit 1.
 *   A conversão NÃO afrouxou nenhuma proteção de segurança.
 * - Nada é allowlist silenciosa: todo toque em superfície do baseline é
 *   impresso explicitamente a cada execução.
 *
 * Compatibilidade: o nome do arquivo e o npm script `guardrail:mvp-freeze`
 * foram mantidos (CI, agentes e PR template os referenciam); existe também o
 * alias `guardrail:mvp-baseline`. `ALLOW_FROZEN_SURFACE_CHANGES=1` continua
 * aceito, mas é desnecessário para mudanças de produto desde a conversão.
 */
import { spawnSync } from 'node:child_process';
import { baselineSurfaces, guardrailAllowlist, securityInvariantGates } from './mvp-freeze-config.mjs';
import { collectChangedFiles } from './git-diff-utils.mjs';

function matchSurface(file) {
  return baselineSurfaces.find((surface) => surface.prefixes.some((prefix) => file.startsWith(prefix)));
}

const baseRef = process.env.MVP_FREEZE_BASE || 'origin/main';
const { baseRef: resolvedBaseRef, files: changedFiles } = collectChangedFiles(baseRef);
const baseLabel = resolvedBaseRef ?? `${baseRef} (indisponível)`;

if (changedFiles.length === 0) {
  console.log(`[guardrail:mvp-baseline] Nenhuma mudança detectada contra ${baseLabel}.`);
}

const touched = changedFiles
  .filter((file) => !guardrailAllowlist.has(file))
  .map((file) => ({ file, surface: matchSurface(file) }))
  .filter((entry) => entry.surface);

if (touched.length > 0) {
  // Advisory alto e explícito — detecção de regressão, NUNCA bloqueio.
  console.warn(`[guardrail:mvp-baseline] Mudanças intencionais detectadas em ${touched.length} arquivo(s) de superfície do baseline (base: ${baseLabel}). Desenvolvimento segue livre; revise se a mudança era intencional:`);
  for (const { file, surface } of touched) {
    console.warn(`  [BASELINE-TOUCH] ${file} -> ${surface.label}`);
  }
  if (process.env.ALLOW_FROZEN_SURFACE_CHANGES === '1') {
    console.warn('[guardrail:mvp-baseline] Nota: ALLOW_FROZEN_SURFACE_CHANGES=1 está definido, mas é desnecessário desde a conversão Freeze → Baseline.');
  }
} else {
  console.log(`[guardrail:mvp-baseline] OK. Nenhuma superfície do baseline alterada em ${changedFiles.length} arquivo(s).`);
}

// Security invariants: obrigatórios e bloqueantes. Fail closed inclusive se
// o próprio gate falhar ao executar.
let securityFailed = false;
for (const gate of securityInvariantGates) {
  console.log(`[guardrail:mvp-baseline] Executando gate obrigatório: ${gate.label} (npm run ${gate.command})...`);
  const result = spawnSync('npm', ['run', gate.command], { stdio: 'inherit', shell: true });
  if (result.error || result.status !== 0) {
    console.error(`[guardrail:mvp-baseline] BLOQUEIO: gate de segurança '${gate.label}' falhou. Corrija antes de prosseguir — este bloqueio NÃO foi removido pela conversão.`);
    securityFailed = true;
  }
}

if (securityFailed) {
  process.exit(1);
}

console.log('[guardrail:mvp-baseline] OK. Baseline reportado; invariants de segurança verificados.');
process.exit(0);
