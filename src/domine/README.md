# Domine Stack

Módulo isolado contendo as definições de base da plataforma "Domine".
Este módulo expõe capabilities, modelos (Zod + TS), eventos estruturados e um *Connector Kit* base.

## Arquitetura Multi-Tenant SaaS vs. Pilotos
1. **Infraestrutura SaaS Agnóstica**: O módulo `src/domine/` é puramente agnóstico a tenants. Todos os eventos, modelos e conectores operam sob contexto explícito de `tenantId`.
2. **Feature Flagging**: A ativação da camada Domine é controlada por tenant via `isDomineEnabled(tenantId)` em banco de dados (`config_entries`), sem nenhum tenant fundador hardcoded como default de produção.
3. **Instalações e Demos**: Dados específicos de pilotos ou lojas fundadoras são isolados como fixtures ou seeds de demonstração opcionais.

## Regras
1. **Sem acoplamento forte**: Nenhuma dependência com `/app` ou componentes frontend aqui.
2. **Uso isolado**: Este módulo define os contratos que serão implementados por adaptadores e consumidos pela API.
