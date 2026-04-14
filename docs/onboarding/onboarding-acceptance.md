# Onboarding — Critérios de aceite do piloto

**Propósito:** definir objetivamente quando um piloto está funcionando e quando está em risco.

---

## O que é um "piloto válido"

Um piloto é considerado válido quando o cliente consegue executar o fluxo completo do MVP de forma autônoma, com pedidos reais, sem suporte constante do responsável CONDSTORE OS.

**Não é sobre volume.** É sobre capacidade operacional real.

---

## Critérios de aceite técnico (Pós-setup)

Antes de declarar o setup concluído, todos estes critérios devem ser atingidos:

| Critério | Como verificar | Aceitável |
|---|---|---|
| **Mensagem recebida** | Enviar mensagem e ver no inbox | Aparece em < 15 segundos |
| **Cotação gerada** | Solicitar cotação com CEP válido | Pelo menos 1 opção retornada |
| **Pedido criado** | Criar pedido a partir de cotação | Status CREATED na fila |
| **Fila de logística ativa** | Abrir aba Logística | Pedido visível com dados corretos |
| **Usuários acessando** | Confirmar login de ao menos 2 usuários | Login com papel correto |
| **Isolamento de tenant** | Verificar que não vê dados de outros tenants | Apenas dados do próprio tenant |

---

## Critérios de aceite operacional (Após 48h)

Verificar após as primeiras 48h de operação real:

| Critério | Meta mínima | Como verificar |
|---|---|---|
| **Recebeu mensagens reais** | ≥ 3 mensagens no inbox | Contagem de conversas |
| **Gerou cotações reais** | ≥ 3 cotações | Contagem em freight_simulations |
| **Criou pedidos reais** | ≥ 2 pedidos | Contagem em orders com status ≠ draft |
| **Gestor acessou o painel** | ≥ 1 vez | Login de usuário com papel gerente/admin |
| **Zero erros críticos abertos** | 0 | Sem tickets ou bugs bloqueantes |

---

## Critérios de aceite do piloto (30 dias)

Ao final dos 30 dias, o piloto é considerado bem-sucedido se:

| Critério | Meta mínima |
|---|---|
| **Pedidos criados via sistema** | ≥ 15 no período |
| **Cotações geradas** | ≥ 20 no período |
| **Operador usa sem suporte constante** | Usa sozinho 90% dos dias |
| **Gestor consulta painel** | Pelo menos 2x por semana |
| **Nenhum pedido perdido por falha do sistema** | 0 |
| **NPS do operador** | ≥ 7 (pergunta: "De 0 a 10, recomendaria para outro operador?") |

---

## Definição de "piloto em risco"

O piloto está em risco se ao fim da primeira semana:

- Menos de 3 pedidos criados
- Operador não usa o sistema diariamente
- Algum erro técnico não resolvido em aberto
- Cliente não responde check-ins

**Ação quando piloto está em risco:**
1. Contato imediato com o decisor (não só com o operador)
2. Diagnosticar se é técnico, de adoção ou de expectativa
3. Corrigir dentro de 48h ou reconhecer que o cliente não é fit no momento

---

## O que NÃO é critério de aceite

Para evitar confusão com expectativas fora do MVP:

- ❌ "Sistema respondeu automaticamente no WhatsApp" — não é funcionalidade do MVP
- ❌ "Integrou com nosso ERP" — fora do escopo
- ❌ "IA sugeriu resposta" — fora do escopo
- ❌ "Emitiu nota fiscal" — fora do escopo
- ❌ "Número de pedidos aumentou X%" — resultado de negócio, não critério de aceite do sistema

O sistema é validado quando executa o fluxo correto. Resultado comercial é responsabilidade do cliente.

---

## Checklist de aceite formal (documento para assinar ou confirmar por escrito)

Enviar ao decisor do cliente ao final do setup:

```
CONFIRMAÇÃO DE ACEITE — CONDSTORE OS PILOTO
Cliente: ________________________________
Data: ____/____/________

Confirmo que o ambiente CONDSTORE OS foi configurado e que:

[ ] Conseguimos receber mensagens WhatsApp no cockpit
[ ] Conseguimos solicitar e visualizar cotações de frete
[ ] Conseguimos criar pedidos a partir de cotações
[ ] Conseguimos acompanhar pedidos na fila de logística
[ ] Usuários do time têm acesso e sabem usar o sistema

Com base nisto, declaramos o INÍCIO OFICIAL DO PILOTO.

Data de início: ____/____/________
Data de revisão de 30 dias: ____/____/________

Responsável CONDSTORE OS: ________________________
Responsável do cliente: __________________________
```

---

## Revisão de 30 dias — roteiro

**Duração:** 30–45 minutos
**Participantes:** responsável CONDSTORE OS + decisor do cliente

**Agenda:**

| Item | Duração |
|---|---|
| Apresentação de dados do período | 10 min |
| Experiência do time operacional | 10 min |
| Comparação antes/depois | 5 min |
| Dores ainda não resolvidas | 5 min |
| Decisão de continuidade | 5 min |

**Dados para preparar antes da revisão:**
- Total de pedidos criados no período
- Total de cotações realizadas
- Carrier mais usado
- Dias com uso × dias sem uso
- Problemas técnicos que ocorreram (e como foram resolvidos)

**Pergunta de encerramento:**
> "Dado o que vimos nestes 30 dias, faz sentido continuar? Se sim, qual é o próximo passo?"

---

## Saídas possíveis da revisão de 30 dias

| Resultado | Ação |
|---|---|
| **Piloto bem-sucedido** | Converter para contrato, definir plano e mensalidade |
| **Piloto parcial** | Estender por mais 30 dias com ajuste específico |
| **Piloto sem adoção** | Encerrar — registrar motivo para aprendizado |
| **Cliente não é fit** | Encerrar — registrar para não reabordar sem mudança de contexto |

---

## Registro pós-piloto

Independente do resultado, registrar internamente:

```
RESULTADO DO PILOTO — [Nome do Cliente]
Período: DD/MM a DD/MM/AAAA

MÉTRICAS FINAIS:
- Pedidos criados: X
- Cotações geradas: X
- Dias com uso: X de 30

RESULTADO:
- [ ] Convertido para contrato
- [ ] Extendido
- [ ] Encerrado — motivo: ___________
- [ ] Cliente não fit — motivo: ___________

APRENDIZADOS:
1. O que funcionou: ___________
2. O que não funcionou: ___________
3. O que não esperávamos: ___________

AÇÃO PARA PRÓXIMOS PILOTOS:
___________
```
