## Tipo de mudança

- [ ] feat — nova feature de produto (MVP Core)
- [ ] fix — correção de bug
- [ ] chore — infraestrutura, CI, governança (sem impacto em runtime)
- [ ] docs — apenas documentação
- [ ] refactor — refatoração sem mudança de comportamento
- [ ] test — apenas testes
- [ ] hotfix — correção crítica em produção

## Escopo Real

<!-- Descreva APENAS o que o diff realmente altera. Não inclua claims de mudanças que não estão no diff. -->

**O que muda:**

**O que NÃO muda:**

**Superfícies tocadas:** (runtime / docs / ci / governance / frozen — se frozen, justificar)

## Motivação / Contexto

<!-- Por que essa mudança é necessária? Qual problema resolve? -->

## Checklist

- [ ] Gates locais passando (`npm run typecheck`, `npm run lint`, `npm run test:ci`)
- [ ] Diff revisado: sem overclaim, sem arquivos não relacionados
- [ ] Se runtime: `npm run routes:verify-security` passou
- [ ] Se superfície de produto: `npm run guardrail:mvp-freeze` passou
- [ ] Sem secrets hardcoded em código, YAML ou logs
- [ ] PII não exposta em logs, eventos ou respostas de API públicas
- [ ] Auth, tenant isolation e guards preservados (ou impacto explicitado abaixo)
- [ ] Testes adicionados/atualizados se comportamento mudou
- [ ] CODEOWNERS revisado se paths protegidos foram alterados

## Issues fechadas

<!-- Closes #NNN -->

## Evidência / Resultado dos Gates

<!-- Cole saída dos gates críticos ou link para CI run -->

