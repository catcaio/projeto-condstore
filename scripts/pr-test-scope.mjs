import { execFileSync } from 'node:child_process';
import {
  broadCoveragePrefixes,
  buildPrefixes,
  dbPrefixes,
  publicGuardrailPrefixes,
  routeSecurityPrefixes,
  routeSyncPrefixes,
  routeSyncSuffixes,
  scopeRules,
  supportSeamEscalations,
} from './mvp-freeze-config.mjs';

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

function matchesAnyPrefix(file, prefixes) {
  return (prefixes ?? []).some((prefix) => file === prefix || file.startsWith(prefix));
}

function matchesRule(file, rule) {
  return matchesAnyPrefix(file, rule.prefixes) && !matchesAnyPrefix(file, rule.excludePrefixes);
}

function matchesRouteSync(file) {
  return matchesAnyPrefix(file, routeSyncPrefixes) && routeSyncSuffixes.some((suffix) => file.endsWith(suffix));
}

function addCommand(set, command) {
  if (command) set.add(command);
}

function parseExplicitFiles(argv) {
  const flagIndex = argv.indexOf('--files');
  if (flagIndex === -1) return [];

  return [...new Set(
    argv
      .slice(flagIndex + 1)
      .map((file) => file.trim())
      .filter(Boolean),
  )];
}

const baseRef = process.env.MVP_FREEZE_BASE || 'origin/main';
const explicitFiles = parseExplicitFiles(process.argv.slice(2));
const changedFiles = explicitFiles.length > 0 ? explicitFiles : collectChangedFiles(baseRef);
const commandSet = new Set(['npm run guardrail:mvp-freeze']);
const matchedRules = [];
const supportSeamMatches = [];
const coreAreas = new Set();

for (const rule of scopeRules) {
  const hits = changedFiles.filter((file) => matchesRule(file, rule));
  if (hits.length === 0) continue;

  matchedRules.push({ label: rule.label, hits });
  if (rule.coreArea) {
    coreAreas.add(rule.coreArea);
  }
  for (const command of rule.commands) {
    addCommand(commandSet, command);
  }
}

const fullyCrossCuttingCoreDiff = ['whatsapp', 'cockpit', 'freight'].every((area) => coreAreas.has(area));
if (fullyCrossCuttingCoreDiff) {
  addCommand(commandSet, 'npm run test:mvp');
}

for (const seam of supportSeamEscalations) {
  const hits = changedFiles.filter((file) => matchesRule(file, seam));
  if (hits.length === 0) continue;

  const applied = (seam.minCoreAreas ?? 0) <= coreAreas.size;
  supportSeamMatches.push({ ...seam, hits, applied });
  if (!applied) continue;

  for (const command of seam.commands) {
    addCommand(commandSet, command);
  }
}

if (changedFiles.some((file) => matchesAnyPrefix(file, routeSecurityPrefixes))) {
  addCommand(commandSet, 'npm run routes:verify-security');
}

if (changedFiles.some((file) => matchesRouteSync(file))) {
  addCommand(commandSet, 'npm run routes:sync');
}

if (changedFiles.some((file) => matchesAnyPrefix(file, dbPrefixes))) {
  addCommand(commandSet, 'npm run db:verify');
}

if (changedFiles.some((file) => matchesAnyPrefix(file, publicGuardrailPrefixes))) {
  addCommand(commandSet, 'node --import tsx scripts/guardrails-public-api.ts');
}

if (changedFiles.some((file) => matchesAnyPrefix(file, buildPrefixes))) {
  addCommand(commandSet, 'npm run build');
}

if (changedFiles.some((file) => matchesAnyPrefix(file, broadCoveragePrefixes))) {
  addCommand(commandSet, 'npm run test:coverage');
}

if (changedFiles.length === 0) {
  console.log(`[scope:pr-tests] Nenhuma mudança detectada contra ${baseRef}.`);
  process.exit(0);
}

if (explicitFiles.length > 0) {
  console.log('[scope:pr-tests] Avaliando arquivos informados via --files.');
} else {
  console.log(`[scope:pr-tests] Base: ${baseRef}`);
}
console.log('[scope:pr-tests] Arquivos alterados:');
for (const file of changedFiles) {
  console.log(`- ${file}`);
}

if (matchedRules.length > 0) {
  console.log('[scope:pr-tests] Regras acionadas:');
  for (const rule of matchedRules) {
    console.log(`- ${rule.label}: ${rule.hits.join(', ')}`);
  }
}

if (supportSeamMatches.length > 0) {
  console.log('[scope:pr-tests] Costuras support avaliadas:');
  for (const seam of supportSeamMatches) {
    const threshold = seam.minCoreAreas ?? 0;
    const outcome = seam.applied
      ? seam.commands.join(', ')
      : `sem escalada automática (áreas core detectadas: ${coreAreas.size}/${threshold})`;
    console.log(`- ${seam.label}: ${seam.hits.join(', ')} -> ${outcome}`);
  }
}

if (fullyCrossCuttingCoreDiff) {
  console.log('[scope:pr-tests] Diff cruzou WhatsApp + cockpit + freight; escalando para npm run test:mvp.');
}

console.log('[scope:pr-tests] Comandos mínimos sugeridos:');
for (const command of commandSet) {
  console.log(`- ${command}`);
}
