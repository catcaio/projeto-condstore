import fs from 'fs';
import path from 'path';

const targetPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
const marker = "program.command('lint')";

function injectLintCommand(source) {

  const anchor = "program.command('telemetry')";
  const insertIndex = source.indexOf(anchor);

  if (insertIndex === -1) {
    throw new Error('Failed to locate insertion point for lint command.');
  }

  const lintCommand = `
program.command('lint').description('Runs ESLint for the project.').argument('[directory]', 'A directory to lint. If no directory is provided, the current directory will be used.').option('--fix', 'Fix lint errors').action((directory, options)=> {
    const path = require('path');
    const { spawnSync } = require('child_process');
    const projectDir = directory ? path.resolve(directory) : process.cwd();
    const eslintPkg = require.resolve('eslint/package.json', { paths: [projectDir] });
    const eslintDir = path.dirname(eslintPkg);
    const eslintBin = path.join(eslintDir, 'bin', 'eslint.js');
    const args = [eslintBin, projectDir, '--ext', '.js,.jsx,.ts,.tsx'];
    if (options.fix) args.push('--fix');
    const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
    process.exit(result.status ?? 1);
});
`;
  if (source.includes(marker)) {
    const start = source.indexOf(marker);
    const end = source.indexOf("program.command('telemetry')", start);
    if (end === -1) {
      throw new Error('Failed to locate telemetry command after lint block.');
    }
    return source.slice(0, start) + lintCommand + source.slice(end);
  }

  return source.slice(0, insertIndex) + lintCommand + source.slice(insertIndex);
}

if (!fs.existsSync(targetPath)) {
  throw new Error(`Next CLI not found at ${targetPath}`);
}

const current = fs.readFileSync(targetPath, 'utf8');
const updated = injectLintCommand(current);

if (updated !== current) {
  fs.writeFileSync(targetPath, updated, 'utf8');
  console.log('[patch-next-lint] Lint command injected into Next CLI.');
} else {
  console.log('[patch-next-lint] Lint command already present.');
}
