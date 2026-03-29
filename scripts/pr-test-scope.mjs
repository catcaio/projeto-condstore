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
  return prefixes.some((prefix) => file === prefix || file.startsWith(prefix));
}

function matchesRouteSync(file) {
  return matchesAnyPrefix(file, routeSyncPrefixes) && routeSyncSuffixes.some((suffix) => file.endsWith(suffix));
}

function addCommand(set, command) {
  if (command) set.add(command);
}

const baseRef = process.env.MVP_FREEZE_BASE || 'origin/main';
const changedFiles = collectChangedFiles(baseRef);
const commandSet = new Set(['npm run guardrail:mvp-freeze']);
const matchedRules = [];

for (const rule of scopeRules) {
  const hits = changedFiles.filter((file) => matchesAnyPrefix(file, rule.prefixes));
  if (hits.length === 0) continue;

  matchedRules.push({ label: rule.label, hits });
  for (const command of rule.commands) {
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

console.log(`[scope:pr-tests] Base: ${baseRef}`);
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

console.log('[scope:pr-tests] Comandos mínimos sugeridos:');
for (const command of commandSet) {
  console.log(`- ${command}`);
}
