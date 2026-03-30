# CONDSTORE OS — Proposta de Piloto

> **Consolidado em:** 2026-03-30
> **Fontes:** docs/pilots/* · docs/onboarding/onboarding-flow.md · docs/roi/roi-metrics.md · docs/roi/baseline-capture.md
> **Este arquivo:** proposta-padrão para apresentar ao cliente ao fechar o piloto

---

## Objetivo do piloto

Validar se o CONDSTORE OS reduz atrito operacional real na sua operação — especificamente:
- Tempo de cotação de frete
- Número de ferramentas que o operador abre por pedido
- Visibilidade do gestor sobre pedidos em aberto

O piloto não é prova de conceito técnica. É operação real com dados reais do cliente.

---

## Duração

**30 dias corridos** a partir do início do onboarding.

| Fase | Período | O que acontece |
|---|---|---|
| Setup + treinamento | Dias 1–2 | Configuração completa + treinamento do time |
| Início assistido | Dias 2–3 | Operação real com acompanhamento próximo |
| Operação autônoma | Dias 4–28 | Cliente opera; CONDSTORE OS acompanha semanalmente |
| Revisão de 30 dias | Dia 30 | Decisor + responsável CONDSTORE OS avaliam resultado |

---

## Escopo do piloto

**O que está incluído:**
- Cockpit web para os operadores do piloto
- Integração WhatsApp via Twilio (número da empresa conectado)
- Carriers ativos: Melhor Envio API + carriers de tabela cadastrados
- Multi-usuário com controle de acesso por papel
- Histórico de clientes e pedidos
- Suporte via canal dedicado durante os 30 dias
- Revisão semanal (check-in de 15 minutos às sextas)
- Revisão formal ao final dos 30 dias

**O que está explicitamente fora do piloto:**
- Integração com ERP, WMS ou sistema fiscal
- Respostas automáticas por IA
- Disparo de campanhas de WhatsApp
- Gestão de estoque
- Emissão de nota fiscal
- Importação automática de base de clientes existente
- Qualquer customização fora do fluxo padrão: mensagem → cotação → pedido → logística

---

## Responsabilidades do cliente

Para o piloto funcionar, o cliente precisa garantir:

| Item | Prazo |
|---|---|
| Número WhatsApp disponível para integração (Twilio Business API) | Antes do kickoff |
| Tabelas de frete dos carriers (formato de arquivo) | Antes do kickoff |
| Lista de usuários: nome, e-mail, papel (operador/gerente) | Antes do kickoff |
| CEP de origem (endereço de despacho) | Antes do kickoff |
| Presença no treinamento (pelo menos 1 operador + 1 responsável) | Dia 2 |
| Uso real do sistema durante os 30 dias | Dias 2–30 |
| Participação na revisão de 30 dias (decisor presente) | Dia 30 |

**Nota importante:** o piloto requer uso real. Se o operador não usar o sistema durante as primeiras 2 semanas, o piloto não produzirá dados para avaliação.

---

## Entregáveis ao final do piloto

Ao fim dos 30 dias, o cliente receberá:

1. **Relatório de uso:** pedidos criados, cotações realizadas, carriers usados, usuários ativos
2. **Comparativo baseline vs. resultado:** tempo de cotação antes/depois, ferramentas por pedido antes/depois
3. **ROI calculado:** horas economizadas, valor financeiro baseado no custo/hora do operador
4. **Registro de issues:** problemas encontrados e como foram resolvidos
5. **Recomendação de continuidade:** análise direta sobre se faz sentido continuar e em qual plano

---

## Critérios de sucesso

O piloto será considerado bem-sucedido se ao final de 30 dias:

| Critério | Meta |
|---|---|
| Pedidos criados via cockpit | ≥ 15 pedidos no período |
| Cotações realizadas via cockpit | ≥ 20 cotações no período |
| Tempo médio de cotação | < 1 minuto (vs. baseline do cliente) |
| Operador usa sem precisar ser lembrado | Sim (adesão espontânea) |
| NPS do operador | ≥ 7/10 |
| Gestor vê valor na visibilidade | Sim (qualitativo) |

Critérios de fracasso:
- Menos de 5 pedidos criados em 30 dias (não usou)
- Operador voltou para fluxo anterior antes de 2 semanas
- Erro crítico bloqueante não resolvido em 48h

---

## O que fica fora do piloto

Para não criar expectativas incorretas:

- **Automação total:** o operador continua aprovando cada cotação e cada pedido
- **Frank / IA:** não ativo no Lote 1
- **Integração com ERP:** o CONDSTORE OS é standalone
- **Analytics avançado:** relatórios além do básico (pedidos, cotações, carriers)
- **Customizações de fluxo:** o piloto usa o fluxo padrão do MVP
- **Garantia de resultado financeiro:** o ROI depende do volume e da adoção real

---

## Próximo passo para fechar o piloto

Para abrir o piloto, precisamos:

1. **Kickoff marcado** com data e presença confirmada
2. **Responsável do cliente definido** (quem aprova o piloto, quem acompanha)
3. **Dados mínimos coletados** (WhatsApp, tabelas de frete, usuários)
4. **Acordo sobre escopo** (este documento ou equivalente assinado)

**Para coletar os dados antes do kickoff:**
Veja [`docs/onboarding/onboarding-data-required.md`](../onboarding/onboarding-data-required.md)

**Para acompanhar o piloto semana a semana:**
Veja [`docs/roi/pilot-scorecard.md`](../roi/pilot-scorecard.md)

---

## Referências relacionadas

- Funil de pilotos: [`docs/pilots/pilot-pipeline.md`](../pilots/pilot-pipeline.md)
- Fluxo de onboarding: [`docs/onboarding/onboarding-flow.md`](../onboarding/onboarding-flow.md)
- Captura de baseline: [`docs/roi/baseline-capture.md`](../roi/baseline-capture.md)
- Métricas de ROI: [`docs/roi/roi-metrics.md`](../roi/roi-metrics.md)
- Scorecard semanal: [`docs/roi/pilot-scorecard.md`](../roi/pilot-scorecard.md)
