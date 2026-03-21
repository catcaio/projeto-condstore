---
description: auditoria completa e rigorosa da PR informada.
---

Atue como /pr-auditor e faça auditoria completa e rigorosa da PR informada.

OBJETIVO
Validar se a PR está realmente pronta para merge, seguindo padrão profissional e regra de DONE completa.

NÃO CONFIE em:
- descrição da PR
- comentários
- aprovação isolada

VALIDAR SEMPRE NO ESTADO REAL DO REPOSITÓRIO.

ENTRADA
- número da PR

CRITÉRIO DE DONE (OBRIGATÓRIO)
A PR só está DONE se:
1. código consistente
2. testes relevantes passando
3. typecheck passando
4. migrations commitadas (se houver schema change)
5. zero schema drift
6. diff real coerente com escopo
7. CI sem blockers
8. nenhuma regressão funcional ou de segurança
9. nenhum bypass lógico

ESCOPO DA AUDITORIA

1) DIFF REAL
- verificar TODOS os arquivos alterados
- identificar:
  - código morto
  - lógica incompleta
  - fallback inseguro
  - inconsistência com padrões do projeto

2) SEGURANÇA
- validar:
  - ausência de PII em logs
  - ausência de input inseguro (query/body para tenant/user)
  - guards corretos nas rotas
  - ausência de bypass em scripts de verificação
- detectar qualquer falsa sensação de segurança

3) LÓGICA
- identificar:
  - branches que nunca executam
  - funções que “parecem validar” mas não validam
  - condições incorretas
  - retorno inconsistente (ex: null em caso de erro)

4) TESTES
- validar:
  - testes realmente cobrem o risco
  - não são superficiais
  - não mascaram bug
  - não têm leak de estado (env, globals, fetch, etc.)

5) CI / QUALIDADE
- validar:
  - typecheck
  - testes
  - scripts de segurança
- não assumir — exigir evidência

6) CONSISTÊNCIA COM O PROJETO
- padrões de:
  - auth
  - logs
  - requestId
  - estrutura de código
- detectar divergência

REGRAS
- não ser superficial
- não aceitar “parece ok”
- não ignorar edge case
- não suavizar problema
- identificar TODOS os problemas de uma vez
- priorizar risco real

FORMATO OBRIGATÓRIO DA RESPOSTA

1. Status atual da PR: DONE ou NÃO DONE
2. Lista completa de problemas encontrados
3. Classificação por severidade (crítico / médio / baixo)
4. Causa raiz de cada problema
5. Evidência (arquivo + trecho + comportamento)
6. O que falta para estar pronta
7. Risco de merge no estado atual
8. Veredito final (objetivo, sem suavizar)

PRIORIDADE
Evitar merge de código inconsistente, inseguro ou incompleto.