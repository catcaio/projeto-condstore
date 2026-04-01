# MVP Go Live — Estrutura Operacional (Linear)

**Issue origem:** `MPV-21: MVP go`
**Atualizado em:** 2026-04-01
**Responsável padrão:** Rafael Barros
**Regra de execução:** escopo incremental, sem expansão para superfícies adjacentes/frozen.

---

## Initiative

- **Nome:** `CONDSTORE OS — MVP Go Live`
- **Objetivo:** fechar o go-live do MVP supervisionado com execução operacional rastreável, PRs pequenas e entregáveis.

## Projects (dentro da Initiative)

1. **Frank Agent Loop**
2. **MVP Frontend Alignment**
3. **Cockpit & Metrics**
4. **Pilot 01 — Lojacond**

---

## Issues a criar em `Frank Agent Loop`

> Todas as issues abaixo devem ser criadas com:
>
> - **Priority:** `High`
> - **Assignee:** `Rafael Barros`
> - **Label sugerida:** `mvp-go-live`
> - **Tamanho:** pequena e fechável

### 1) Tool Runner centralization

**Título sugerido (Linear):** `Frank Agent Loop: Tool Runner centralization`

**Descrição:**
Centralizar a execução de ferramentas do loop do Frank em um único ponto de orquestração, removendo variações de chamada espalhadas.

**Escopo incremental (in):**
- Mapear os pontos atuais de invocação do runner.
- Definir um contrato único de entrada/saída.
- Direcionar chamadas existentes para o runner central com compatibilidade.
- Garantir logs estruturados por execução (start/success/failure).

**Fora de escopo (out):**
- Refatoração ampla de runtime/autonomia do Frank.
- Mudança de provider/modelo.
- Evolução de superfícies frozen de training/knowledge/playbooks.

**Critérios de aceite:**
- Existe um caminho padrão único para execução de tools.
- Chamadas legadas críticas passam pelo ponto central.
- Erros externos possuem timeout/retry/registro padronizado.
- PR pequena, com testes mínimos do escopo alterado.

---

### 2) Policy enforcement expansion

**Título sugerido (Linear):** `Frank Agent Loop: Policy enforcement expansion`

**Descrição:**
Expandir a aplicação de políticas de segurança e operação para cobrir todo o loop supervisionado, sem aumentar autonomia do agente.

**Escopo incremental (in):**
- Cobrir caminhos ainda sem enforcement explícito.
- Uniformizar validações obrigatórias antes de ação crítica.
- Adicionar trilha de auditoria estruturada para decisões de bloqueio/liberação.

**Fora de escopo (out):**
- Criação de nova policy engine complexa.
- Alterações de produto fora do loop do Frank.

**Critérios de aceite:**
- Fluxos alvo rejeitam ações sem política válida.
- Decisão de policy fica auditável em log/evento.
- Sem regressão no modo supervisionado atual.

---

### 3) Memory persistence upgrade

**Título sugerido (Linear):** `Frank Agent Loop: Memory persistence upgrade`

**Descrição:**
Melhorar persistência de memória operacional do loop para reduzir perda de contexto entre ciclos, mantendo isolamento por tenant.

**Escopo incremental (in):**
- Revisar ponto atual de persistência e leitura.
- Ajustar contrato de armazenamento para consistência mínima.
- Garantir tenant scoping explícito em leitura/escrita.
- Instrumentar métricas básicas de sucesso/falha de persistência.

**Fora de escopo (out):**
- Introdução de RAG/knowledge authoring.
- Reprojeto completo de memória de longo prazo.

**Critérios de aceite:**
- Contexto essencial é recuperado entre ciclos previstos.
- Não há leitura/escrita sem `tenant_id`.
- Falhas de persistência são observáveis.

---

### 4) Sub-agent separation

**Título sugerido (Linear):** `Frank Agent Loop: Sub-agent separation`

**Descrição:**
Separar responsabilidades de sub-agentes no loop com contratos explícitos para reduzir acoplamento e facilitar troubleshooting.

**Escopo incremental (in):**
- Definir fronteiras mínimas de responsabilidade.
- Isolar interfaces entre sub-agentes críticos.
- Padronizar handoff com logs estruturados.

**Fora de escopo (out):**
- Reescrita completa da arquitetura de agentes.
- Criação de novos produtos/superfícies de UI.

**Critérios de aceite:**
- Cada sub-agente crítico tem responsabilidade clara.
- Handoff entre sub-agentes é rastreável.
- Mudança cabe em PR pequena e revisável.

---

### 5) Telemetry standardization

**Título sugerido (Linear):** `Frank Agent Loop: Telemetry standardization`

**Descrição:**
Padronizar telemetria do loop (logs, eventos e métricas operacionais) para diagnóstico consistente em produção.

**Escopo incremental (in):**
- Definir campos padrão de log/evento.
- Normalizar nomes de métricas-chave do loop.
- Garantir correlação por execução (trace/correlation id quando aplicável).

**Fora de escopo (out):**
- Plataforma nova de observabilidade.
- Dashboard completo fora do mínimo necessário.

**Critérios de aceite:**
- Eventos principais seguem formato consistente.
- Métricas mínimas do loop ficam comparáveis entre execuções.
- Incidentes têm trilha suficiente para diagnóstico.

---

## Sequência recomendada (PRs pequenas)

1. `Tool Runner centralization`
2. `Policy enforcement expansion`
3. `Telemetry standardization`
4. `Memory persistence upgrade`
5. `Sub-agent separation`

> Justificativa: consolidar execução e guardrails primeiro, estabilizar observabilidade, e só então avançar em memória/separação com menor risco.
