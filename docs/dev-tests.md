# Dev Tests (Windows / PowerShell)

## Comandos recomendados

- `npm run test:ci`
- `npm run test:win-stable`

## Nota sobre `EPERM` no Windows

Usamos `vitest.config.mjs` + `--configLoader runner` para evitar o caminho de bundle/transpile do config via esbuild, o que reduz falhas `spawn EPERM` em ambientes Windows restritos.

- `test:ci` roda com `VITEST_POOL=threads` (mais compatível em shells/sandboxes restritos).
- `test:win-stable` força `VITEST_POOL=forks` para execução estável em Windows local normal.
