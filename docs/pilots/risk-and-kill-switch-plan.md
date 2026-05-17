# Plano de Riscos e Kill Switch - Piloto CONDSTORE OS

Este documento formaliza as estratégias de contenção, riscos críticos e critérios de interrupção imediata para a fase de piloto do CONDSTORE OS, atendendo ao requisito MPV-104 (PILOT-05).

## 1. Riscos Críticos Identificados

| Risco | Impacto | Mitigação |
|---|---|---|
| **Alucinação do Frank (AI)** | Médio/Alto | **Modo Supervisionado Obrigatório**: Frank nunca envia mensagens diretamente; ele apenas sugere respostas para aprovação do operador humano. |
| **Vazamento de PII (Multi-tenant)** | Crítico | **Middleware de Isolamento**: Todas as rotas de API validam o `tenantId` via JWT/Sessão e aplicam filtros rigorosos no repositório. |
| **Loop de Mensagens (Auto-reply)** | Alto | **Auto-Response Guard**: Filtros que detectam mensagens automáticas e impedem respostas em cadeia. |
| **Falha de Integração (Twilio/Stripe)** | Médio | **Circuit Breaker**: Implementado nos providers para evitar degradação em cascata e permitir failover gracioso. |
| **Indisponibilidade do Cockpit** | Alto | **Health Checks e Alertas**: Monitoramento contínuo da saúde das APIs e banco de dados. |

## 2. Plano de Contenção e Kill Switch

O sistema possui dois níveis de interrupção operacional por tenant:

### A. Envio Pausado (`outboundEnabled: false`)
- **O que faz**: Bloqueia qualquer tentativa de envio de mensagem de saída (outbound) pelo Twilio.
- **Uso**: Quando o operador deseja pausar a operação para ajustes manuais ou manutenção sem desligar o recebimento de mensagens.
- **Evidência**: Log `twilio_outbound_blocked_by_kill_switch` no sistema de auditoria.

### B. Modo Incidente (`incidentMode: true`)
- **O que faz**: Bloqueia preventivamente operações críticas e sinaliza no Cockpit que a operação está em estado de emergência.
- **Uso**: Em caso de falha sistêmica detectada ou comportamento anômalo da conta.
- **Evidência**: Log `twilio_outbound_blocked_by_incident_mode`.

## 3. Critérios de Interrupção Imediata (Triggers)

A interrupção deve ser acionada manualmente ou via automação caso:

1. **Taxa de Erro Crítica**: Mais de 10% de falha no envio de mensagens nas últimas 100 tentativas.
2. **Denúncia de SPAM**: Notificação oficial do WhatsApp/Twilio sobre risco de banimento do número.
3. **Falha de Isolamento**: Qualquer log de `Security Breach` ou `Unauthorized Tenant Access`.
4. **Anomalia de Volume**: Pico injustificado de mensagens que indique loop ou ataque.
5. **Decisão do Gestor**: Solicitação direta do responsável humano por qualquer motivo operacional.

## 4. Governança e Responsáveis

| Papel | Nome | Responsabilidade |
|---|---|---|
| **Gestor Operacional** | Guto | Decisão de acionamento do Kill Switch por motivos de negócio/operação. |
| **Líder Técnico** | Rafael Barros | Resposta a incidentes técnicos e manutenção da infraestrutura de segurança. |
| **Operador de Cockpit** | Variável (Piloto) | Monitoramento diário e reporte de comportamentos anômalos. |

## 5. Procedimento de Recuperação

Após o acionamento do Kill Switch:
1. Identificar causa raiz via logs de auditoria e cockpit de métricas.
2. Aplicar correção (Hotfix) ou ajuste de configuração.
3. Validar em ambiente de staging/preview.
4. Reativar o switch via `/cockpit/settings/security`.
5. Registrar incidente no `Audit Log`.

---
**Status**: READY_FOR_PILOT_REAL_SUPERVISIONADO
**Escopo do status**: plano pronto para iniciar piloto real controlado. Não declara piloto real concluído.
**Versão**: 1.1.0
**Data**: 2026-05-17
