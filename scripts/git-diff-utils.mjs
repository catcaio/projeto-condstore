import { execFileSync } from 'node:child_process';

function runGit(args, allowFailure = false) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch (error) {
    if (allowFailure) return '';
    throw error;
  }
}

function gitRefExists(ref) {
  return runGit(['rev-parse', '--verify', '--quiet', ref], true).length > 0;
}

function resolveBaseRef(preferredBaseRef = 'origin/main') {
  if (gitRefExists(preferredBaseRef)) return preferredBaseRef;
  if (gitRefExists('main')) return 'main';
  if (gitRefExists('master')) return 'master';
  return null;
}

export function collectChangedFiles(preferredBaseRef = 'origin/main') {
  const resolvedBaseRef = resolveBaseRef(preferredBaseRef);
  const buckets = [
    resolvedBaseRef ? runGit(['diff', '--name-only', '--diff-filter=ACMR', `${resolvedBaseRef}...HEAD`], true) : '',
    runGit(['diff', '--name-only', '--diff-filter=ACMR']),
    runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']),
    runGit(['ls-files', '--others', '--exclude-standard']),
  ];

  return {
    baseRef: resolvedBaseRef,
    files: [...new Set(
      buckets
        .flatMap((output) => output.split(/\r?\n/))
        .map((file) => file.trim())
        .filter(Boolean),
    )],
  };
}
