# Copilot Instructions — Condstore

## Regras obrigatórias

- Nunca alterar código em /src/core sem validação explícita
- Nunca quebrar isolamento de tenant
- Nunca acessar dados entre tenants
- Sempre manter tipagem TypeScript estrita
- Nunca criar código sem contexto do projeto
- Nunca sugerir código genérico sem adaptação ao padrão existente

## Arquitetura

- Respeitar a separação de camadas definida em `docs/architecture/module-boundaries.md` (ver seção **"Camadas do Sistema"**).
- Considerar todas as camadas descritas nesse documento como fonte de verdade (por exemplo: `core`, `modules`, `app`, `infra`, `src/lib/`, `src/domine/`).
- Quando em dúvida sobre a camada correta para um código, consultar primeiro `docs/architecture/module-boundaries.md`.

- Não misturar responsabilidades entre camadas
- Não criar dependência circular

## Regras de PR

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
