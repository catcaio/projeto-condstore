# CONDSTORE OS — Tratamento de Objeções

> **Consolidado em:** 2026-03-30
> **Fontes:** docs/sales/objection-handling.md · docs/product/gtm-mvp.md · docs/mvp/boundaries.md
> **Regra geral:** responder a objeção, confirmar se é dúvida ou bloqueio. Se for bloqueio fora do MVP, encerrar sem insistir.

---

## Objeções principais

---

### "Isso é chatbot?"

**Resposta:**
> "Não. O CONDSTORE OS não responde pelo seu operador e não toma decisões automaticamente. É um cockpit onde o operador vê a mensagem do WhatsApp com o histórico do cliente, cota o frete em segundos e cria o pedido — tudo na mesma tela. Quem decide e responde é sempre o operador."

**Por que funciona:**
Chatbot implica automação de resposta. O produto faz o oposto: dá ao operador mais velocidade e contexto para que ele responda melhor, mais rápido. A supervisão humana é a proposta de valor, não uma limitação.

---

### "E se a cotação sair errada?"

**Resposta:**
> "O sistema consulta carriers em tempo real — Melhor Envio e carriers de tabela cadastrados por você. Se uma cotação vier errada, o operador vê antes de aprovar. Nada sai sem que o operador confirme. Se o dado de entrada estiver errado (CEP, peso), o operador corrige antes de criar o pedido."

**Contexto adicional:**
- Cotação errada por dado incorreto: responsabilidade do operador que insere os dados
- Cotação errada por falha de carrier: operador escolhe outra opção na tela
- Não existe cotação que sai automaticamente sem aprovação humana

---

### "Já tenho ERP"

**Resposta:**
> "O CONDSTORE OS não substitui ERP. A pergunta é: hoje o seu operador consegue atender no WhatsApp, cotar frete e abrir pedido no mesmo fluxo — ou ainda depende de etapas separadas? Se o ERP cobre isso, pode não haver fit. Se não cobre, o cockpit complementa sem conflito."

**Se ERP for bloqueio absoluto:**
> "Se integração com ERP é pré-requisito para testar, melhor não abrir piloto agora. O MVP não depende de ERP para provar valor, mas também não integra com ele hoje."

---

### "Meu time já faz isso no WhatsApp"

**Resposta:**
> "Funcionar não significa escalar. Se o operador ainda troca de tela para cotar e registrar pedido, o gargalo continua. O cockpit não muda o que o time faz — acelera e centraliza. A pergunta prática é: quantas abas o operador abre hoje para fechar 1 pedido?"

**Reforço:**
> "Se a resposta for 1 aba, o cockpit não agrega. Se a resposta for 3 ou 4, vale a conversa."

---

### "Não quero depender de IA"

**Resposta:**
> "Não tem IA autônoma no produto. O CONDSTORE OS não usa IA para responder clientes, sugerir textos ou tomar decisões. Consulta carriers de frete via API (Melhor Envio) e tabelas próprias — que são lógica determinística, não IA. O operador está no centro de cada ação."

**Nota importante:**
Infraestrutura de IA (Frank) existe no código, mas está desligada propositalmente no Lote 1. Não mencionar em contexto comercial — cria expectativa que o MVP não entrega.

---

### "Quanto tempo leva para implantar?"

**Resposta:**
> "O onboarding completo leva 5 a 7 dias corridos. No primeiro dia a gente configura tudo — WhatsApp, carriers, usuários. No segundo dia treinamos o seu time (45 minutos). Do terceiro dia em diante, operação real com acompanhamento próximo. Você não precisa de TI interno."

**Se o cliente tiver urgência:**
> "Conseguimos fazer setup em 2 dias se tivermos os dados antes: número WhatsApp, tabelas de frete e lista de usuários. Conseguindo isso até sexta, operamos na semana seguinte."

**Se o cliente tiver receio de travar operação:**
> "O piloto começa com escopo controlado. Ninguém vira a operação inteira de um dia para o outro. Você escolhe quais operadores entram primeiro e vai expandindo conforme faz sentido."

---

## Objeções secundárias

| Objeção | Resposta direta |
|---|---|
| "Nosso volume é baixo" | Se o volume é baixo e a dor não pesa no dia a dia, melhor não avançar. O piloto precisa resolver um gargalo real. |
| "Trabalhamos com um carrier só" | Se frete não gera comparação nem demora, o ganho pode ser pequeno. Ainda pode haver valor em centralizar atendimento e pedido, mas só avance se essa dor for real. |
| "Tenho medo de travar a operação" | O piloto começa com escopo controlado e acompanhamento próximo. Ninguém precisa virar a operação inteira de um dia para o outro. |
| "Quero esperar mais um pouco" | Sem problema. O que preciso saber é se existe prioridade real nos próximos 30 dias. Se não existe, encerro o ciclo e retomamos quando fizer sentido. |
| "Parece mais uma ferramenta para o operador" | Só vale se reduzir troca de tela. Se na sua avaliação isso não encurta o fluxo, não faz sentido pilotar. |
| "É muito caro" | Quanto tempo seu operador gasta cotando frete por dia? A mensalidade provavelmente custa menos do que isso. |

---

## Regra de encerramento

Se a objeção revelar bloqueio estrutural fora do MVP, encerrar sem insistir:

> "Entendi. Se [ERP / automação total / marketplace] é obrigatório para você testar, eu prefiro parar aqui. O piloto não cobre isso hoje. Se isso mudar ou se o contexto for diferente do que entendi, fico à disposição."

**Não forçar venda.** Registrar como no-fit em [`docs/pilots/pilot-status.md`](../pilots/pilot-status.md).

---

## Referências relacionadas

- Tratamento de objeções por script: [`docs/sales/objection-handling.md`](../sales/objection-handling.md)
- Limites do MVP (o que dizer "não"): [`docs/mvp/boundaries.md`](../mvp/boundaries.md)
- ICP e critérios de descarte: [`docs/sales/icp-definition.md`](../sales/icp-definition.md)
