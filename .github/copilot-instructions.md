# Copilot Instructions — Condstore

## Regras obrigatórias

- Nunca alterar código em `src/core/` sem validação explícita
- Nunca quebrar isolamento de tenant
- Nunca acessar dados entre tenants
- Sempre manter tipagem TypeScript estrita
- Nunca criar código sem contexto do projeto
- Nunca sugerir código genérico sem adaptação ao padrão existente

## Arquitetura

- Seguir sempre as regras e limites de módulos definidos em `docs/architecture/module-boundaries.md`
- Em caso de divergência, considerar `docs/architecture/module-boundaries.md` como fonte da verdade e, se necessário, atualizar este arquivo
- Não criar dependência circular entre módulos/camadas

## PR Rules

- PRs devem ser pequenos
- Uma responsabilidade por PR
- Não alterar múltiplos módulos sem justificativa

## Segurança

- Nunca expor secrets
- Nunca logar dados sensíveis
- Nunca alterar auth sem validação

## Testes

- Sempre sugerir testes quando alterar comportamento
- Nunca alterar comportamento crítico sem teste

## Estilo

- Seguir padrão existente do projeto
- Não introduzir novos padrões sem necessidade
