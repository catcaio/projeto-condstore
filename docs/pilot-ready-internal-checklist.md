# Checklist Interno Go/No-Go — Release Pilot-Ready

Este documento consolida a avaliação final para a transição do sistema para o estado **Pilot-Ready** (Piloto 01). A decisão deve ser baseada em evidências objetivas e conformidade com o escopo do MVP.

## Estados
- **OK**: Critério atendido integralmente.
- **Pendente**: Em execução, não bloqueia se houver plano de mitigação.
- **Bloqueador**: Impede a operação com clientes reais.
- **Não Aplicável (N/A)**: Não exigido para esta fase.

---

## 1. Segurança Básica
- [ ] Isolamento de Tenants (RLS e aplicação) | **OK**
- [ ] Proteção de rotas críticas (`requireAdmin`, `requireInternalToken`) | **OK**
- [ ] Sanitização de PII em logs e base | **OK**
- [ ] Validação de assinaturas de webhooks (Twilio/Stripe) | **OK**

## 2. CI / Security / Vercel
- [ ] Pipeline de CI (Lint/Typecheck/Test) passando | **OK**
- [ ] Security Scan (Secrets/PII) limpo | **OK**
- [ ] Deployment Vercel estável em Staging/Production | **OK**
- [ ] Variáveis de ambiente configuradas por ambiente | **OK**

## 3. Fluxo Supervisionado (Core Operations)
- [ ] Atendimento WhatsApp (Inbound/Outbound) operando com supervisão humana | **OK**
- [ ] Frank AI operando em modo copiloto/sugestão (Auto-reply desativado) | **OK**
- [ ] Fluxo Quote -> Order -> Shipment funcional e rastreável | **OK**
- [ ] Gestão de conversas e status no Cockpit | **OK**

## 4. Métricas Mínimas
- [ ] Registro de eventos operacionais no DOMINE (Conversion/Operational) | **OK**
- [ ] Rastreabilidade de atribuição (UTM/Tokens) funcionando | **OK**
- [ ] Latência do Orchestrator monitorada e dentro do SLA (< 5s p99) | **OK**

## 5. Cockpit Legível
- [ ] Interface de atendimento sem erros críticos de renderização | **OK**
- [ ] Kanban de pedidos refletindo estado real do banco | **OK**
- [ ] Timeline do cliente consolidando histórico multicanal | **OK**

## 6. Documentação Mínima
- [ ] README e Mapas de Arquitetura atualizados | **OK**
- [ ] Runbooks de Operação e Rollback validados | **OK**
- [ ] Guia de Onboarding e Scripts de Venda finalizados | **OK**
- [ ] Plano de Freeze (MVP Core vs Frozen) documentado e respeitado | **OK**

## 7. Riscos Remanescentes
- [ ] **Risco**: Dependência de serviços externos (Twilio/Stripe/Vercel) | **Mitigação**: Fallback manual e monitoramento de status page.
- [ ] **Risco**: Volume de mensagens acima do esperado no Piloto 01 | **Mitigação**: Limite de 2 auto-responses por sessão e supervisão ativa.

## 8. Rollback e Manual Fallback
- [ ] Procedimento de rollback de deploy (Vercel) validado | **OK**
- [ ] Plano para pausar webhooks Twilio em caso de incidente | **OK**
- [ ] Fallback para atendimento via App Oficial do WhatsApp (se necessário) | **OK**

---

## Decisão Final

**Status:** [ ] GO  /  [ ] NO-GO  /  [ ] GO COM RESSALVAS

**Ressalvas (se houver):**
- _Nenhuma ressalva impeditiva identificada até o momento._

**Assinatura:** __________________________ **Data:** ____/____/____
