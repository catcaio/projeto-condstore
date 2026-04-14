# MVP Boundaries: Hardening & Enforcement

## 1. O que está dentro do MVP
O MVP engloba estritamente:
- Operação supervisionada via WhatsApp conduzida por agentes da CONDSTORE (Frank como copiloto).
- CRM logístico e cockpit de atendimento ao cliente.
- Cotação de frete nativa vinculada a parceiros.
- Processamento e gestão do ciclo `cotação -> pedido -> envio`.

## 2. O que está fora do MVP (Congelado)
*As a feature freeze, a CONDSTORE decreta que as seguintes vertentes não devem ser alteradas nem habilitadas no ambiente:*

- **Frank Autônomo e Runtime Misto**: A automação de mensagens finais ao cliente final e atuação por conta própria é TERMINANTEMENTE BLOQUEADA. O modo deverá permanecer sempre estático em `SUPERVISED_ONLY`.
- **Ações de `HIGH_RISK` Sem Autorização Humana**: Mutações no estado do sistema (como criações de pedido, disparos de estorno, etc) exigem token e validação do fluxo humano.
- **Treinamentos e Consoles Secundários**: Playbooks autorais e UI do DOMINE estão congelados na sua estabilidade atual para prevenir creep de escopo.

## 3. Ações Proibidas e Guardrails
- **Configuração de Runtime**: O servidor não processará requisições (`app.config` disparará erro fatal) caso detecte chaves de ambiente indicando volta ao sistema não-supervisionado.
- **Race conditions no Frete**: Fluxo de conversão para pedido bloqueado ativamente por Lock Disribuído atrelado ao `simulationId`, assegurando idempotência estrita. 
- **Execução Clandestina**: Tool runners blindados para abortar qualquer `tool` com bandeira `HIGH_RISK` quando faltar autorização ou flag do supervisor atestando intencionalidade humana.
