# 🛣️ Routing Development Runbook

## Como adicionar uma rota nova?
1. Crie a nova rota no código (ex: `src/app/api/minha-rota/route.ts`).
2. Adicione a documentação da rota desejada no arquivo `docs/routes-registry.md`.
3. Rode o comando de sincronização localmente: `npm run routes:sync`.
4. Commite TUDO junto (o código da rota, o `registry` e o `inventory` gerado automaticamente em `docs/_generated/routes-inventory.md`).

## Rodar `npm run routes:sync`
O comando `npm run routes:sync` é determinístico e faz duas coisas:
- **Inventory**: Vasculha seu sistema de arquivos no Next.js (`src/app`) e gera `docs/_generated/routes-inventory.md`.
- **Verify**: Compara o código fonte com o manual. Falha com detalhes se as rotas em código estiverem pendentes no `docs/routes-registry.md`.

## O que fazer quando o CI acusar drift?
Se o *CI Quality Gate* falhar acusando `Worktree is dirty` (logo após "Verify clean worktree" ou "Verify Routes Guardrail"), significa que:
- Você alterou/adicionou uma rota, mas esqueceu de rodar o sync automático que engloba estas mudanças e commitar o código gerado.

**Para arrumar:**
1. Vá na sua branch local.
2. Adicione as rotas em `docs/routes-registry.md` seguindo o exemplo de layout, se aplicável.
3. Rode `npm run routes:sync`.
4. Rode `git add docs/ -u` e emende o seu commit `git commit --amend` (ou crie um fix commit para corrigir), depois realize `git push` novamente.
