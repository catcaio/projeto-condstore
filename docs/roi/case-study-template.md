# Case Study — Template de Prova de Valor

**Propósito:** Converter pilotos bem-sucedidos em histórias de prova social para vender próximos pilotos.

**Quando usar:** Ao final do piloto bem-sucedido, depois da revisão de 30 dias (veja docs/onboarding/onboarding-acceptance.md)

**Tempo de preenchimento:** 45 minutos (coleta + redação)

**Próxima ação:** Publicar em docs/pilots/ ou usar em pitch de próximos clientes

---

## Template

```
# CASE STUDY — [Nome da Empresa]

## Resumo executivo

[Parágrafo de abertura 2–3 linhas que responde: qual era o problema? como resolvemos? qual foi o resultado?]

**Exemplo:**
"XYZ Distribuidor é uma distribuidora de materiais de construção com 8 operadores que recebem 150 pedidos por mês pelo WhatsApp. Antes do CONDSTORE OS, cada pedido levava 15 minutos para cotar frete — desperdício de 20 horas/mês. Após 30 dias usando o sistema, o tempo caiu para menos de 30 segundos por cotação, liberando 19 horas/mês de trabalho produtivo e eliminando praticamente todos os pedidos perdidos por demora."

---

## Contexto

Quem é a empresa? Onde está? O que faz?

- **Empresa:** [nome completo ou nome fictício se preferir privacidade]
- **Segmento:** [ex: construção, alimentos, insumos industriais, condomínio]
- **Localização:** [cidade/estado]
- **Tamanho:** [número] atendentes, [número] pedidos/mês aprox.
- **Anos de operação:** [contexto de maturidade]

**Adicionar 2–3 frases sobre a empresa:**

Exemplo:
"ABC é uma distribuidora especializada em materiais de acabamento para obras. Fundada em 2015, hoje tem 50+ clientes recorrentes e cresce 20% ao ano. Seus operadores recebem pedidos principalmente pelo WhatsApp de 7h às 18h."

---

## O Problema

Descrever a dor operacional antes do CONDSTORE OS. **2–3 parágrafos.**

### Contexto operacional

[Descrever a situação atual do cliente]

Exemplo:
"A empresa recebia ~150 pedidos por mês via WhatsApp. Quando chegava um pedido, o operador:
1. Abria a mensagem no WhatsApp
2. Anotava o destino (CEP) em um papel ou bloco de notas
3. Saia do WhatsApp e abria site da Melhor Envio no navegador
4. Cotava o frete, anotava as opções
5. Voltava ao WhatsApp e respondía "o frete é R$ X"
6. Quando cliente aprovava, abria planilha, criava um novo pedido
7. Envava e-mail pro gestor confirmando pedido
8. Depois consultava site da transportadora pra rastrear

Eram 4–5 telas diferentes para 1 pedido."

### A dor específica

[O que doía mesmo?]

- **Tempo perdido:** Cada cotação levava 12–15 minutos (retirado do tempo de venda)
- **Pedidos perdidos:** ~10/mês perdidos porque operador demorava responder
- **Falta de visibilidade:** Gestor não sabia quantos pedidos estavam "abertos" sem sair
- **Risco de erro:** Anotação manual causava erros de CEP ou digitação

### Por que não tinham resolvido

[Por que continuava assim?]

Exemplo:
"A empresa considerava integrar com seu ERP, mas orçamento passava R$ 20k. Para um fluxo isolado de cotação, não justificava. Tentaram usar melhor alguns features do site de transportadora, mas cada uma tem interface diferente. Optaram por continuar manual porque era 'mais flexível', mas o custo era enorme."

---

## A Solução — CONDSTORE OS

Como o sistema resolveu? **1 parágrafo.**

**Não mencionar:**
- ❌ IA, automação, Frank
- ❌ Termos técnicos (webhook, tenant, event-driven)
- ❌ Integração com outras ferramentas

**Focar em:**
- ✅ Fluxo novo
- ✅ Simplicidade
- ✅ Resultado concreto

Exemplo:
"Colocamos [quantidade] operadores no CONDSTORE OS. No primeiro treinamento de 1 hora, aprenderam que agora:
1. Recebem a mensagem do WhatsApp
2. Abrem no inbox do cockpit (mesma tela)
3. Clicam 'Cotar' — sistema busca todas as opções de carrier em paralelo
4. Escolhem a melhor opção
5. Clicam 'Criar Pedido' — pronto, já saiu pro transportador

Tudo em 1 tela. Nenhuma abra extra."

---

## O Resultado — Números Reais

Tabela mostrando antes vs. depois.

| Métrica | Antes | Depois | Melhoria |
|---|---|---|---|
| **Tempo por cotação** | 12 min | 30 seg | ↓ 96% |
| **Ferramentas por pedido** | 4–5 | 1 | ↓ 75% |
| **Pedidos criados/dia** | [X] | [Y] | ↑ [Z]% |
| **Pedidos perdidos/mês** | ~10 | <1 | ↓ 90% |
| **Horas/mês liberadas** | — | 19 h | +R$ 950 |
| **Gestor tem visibilidade** | Não | Sim ✓ | Novo |

**Nota:** Todos os números são reais, extraídos de pilot-scorecard.md. Não invente.

---

## Depoimento do Cliente

Citação direta do operador ou gestor. **1–3 frases.**

**Formato:**

> "Aqui na minha primeira semana, cotei uns 20 pedidos e achei incrível porque antigamente eu levava a semana inteira. Agora liberei tempo pra vender, que era o que tava precisando." — [Nome], [Cargo], [Empresa]

ou

> "O sistema tirou o maior gargalo da operação. Cada cotação que levava 15 minutos agora leva menos de 1 minuto. Meu operador está mais feliz e a gente não perde mais pedido por demora." — [Nome], [Cargo], [Empresa]

**Dica:** Pergunte ao cliente isso diretamente na call de revisão e capte a frase mais autêntica. Se preferir privacidade, use nome fictício.

---

## Timeline do Piloto

Quando aconteceu cada marco?

```
Dia 0 (01/03):    Onboarding e primeiro treinamento
Dia 1–2 (02-03):  Primeiras 48h — primeiros 3 pedidos criados ✓
Semana 1 (04-08): 15 cotações, economia R$ 57
Semana 2 (11-15): 18 cotações, economia R$ 72
Semana 3 (18-22): 22 cotações, economia R$ 110
Semana 4 (25-29): 28 cotações, economia R$ 140
Dia 30 (30/03):   Revisão formal, 83 cotações, 55 pedidos criados ✓
```

---

## O Que Funcionou

**3 coisas que funcionaram bem.** Cada uma com 2–3 linhas.

1. **[Ponto forte 1 — provavelmente fluxo ou integração]**

   Exemplo: "O fluxo do WhatsApp direto pra cotação eliminou a principal fricção. Não precisava de abas extras, tudo na mesma tela."

2. **[Ponto forte 2 — provavelmente velocidade ou visibilidade]**

   Exemplo: "A velocidade de cotação abaixo de 30 segundos impressionou o operador. Ele viu que era possível vender E cotar sem pegar 30 minutos do horário."

3. **[Ponto forte 3 — provavelmente suporte ou treinamento]**

   Exemplo: "O treinamento rápido (1 hora) deixou o operador confiante. Ele não se sentiu sobrecarregado com termos técnicos."

---

## O Que Foi Desafio

**2 desafios e como vocês resolveram.**

**Exemplo 1:**

> **Desafio:** "Braspress não tinha opção de retorno configurada, então algumas cotações davam vazio."
>
> **Solução:** Na segunda semana, CONDSTORE OS configurou a tabela de retorno. Problema resolvido.

**Exemplo 2:**

> **Desafio:** "Operador tinha dificuldade em interpretar qual era a melhor opção de carrier (menor preço vs. menor prazo)."
>
> **Solução:** Orientou que "Melhor Envio é mais barato, Braspress é mais rápido — você escolhe pela regra do cliente." Depois ficou claro.

---

## Lições para Próximos Pilotos

**3–4 bullets com aprendizado.**

- Se cliente tem problema comportamental de "ainda prefere jeito antigo", o check-in semanal é crítico nos primeiros 7 dias. Sem suporte próximo, desiste.
- Configuração de carriers ANTES do piloto economiza horas de troubleshooting. Vale investir no setup.
- Gestor envolvido desde dia 1 muda tudo. Se só operador usa, risco é maior.
- Feedback qualitativo do operador é ouro. Escuta o que doeu e o que alegrou — orienta a narrativa.

---

## Conclusão

**1 parágrafo afirmando valor e intenção de continuidade.**

Exemplo:
"[Empresa] converteu o piloto em contrato por 12 meses com plano Essencial. O sistema liberou 19 horas/mês de trabalho do operador, melhorou a experiência do cliente final (resposta em minutos, não horas), e criou visibilidade que o gestor não tinha. A empresa planeja expandir com 2 operadores adicionais no próximo trimestre."

---

## Metadados do case study

(Não aparece no documento, mas registre pra referência)

```
Data de criação: DD/MM/AAAA
Cliente real ou fictício? [Real / Fictício com permissão / Composto de múltiplos clientes]
Cliente autoriza publicação? [Sim / Não]
Se não: usar nome fictício? [Sim / Não]
Status do cliente hoje: [Ativo / Expandiu / Ainda em piloto]
Quem pode citar este case study? [Equipe / Público]
Próximo update: DD/MM/AAAA (após 60 dias de contrato)
```

---

## Exemplos de case study completo

### Exemplo 1 — Distribuidora de alimentos (real)

```
# CASE STUDY — ABC Distribuidor

## Resumo executivo

ABC Distribuidor é uma distribuidora de alimentos com 5 operadores que recebem 120 pedidos/mês via WhatsApp. Antes: cada operador cotava frete manualmente em 3–4 sistemas. Resultado: 15 min por pedido, 10 pedidos/mês perdidos. Depois de 30 dias com CONDSTORE OS: cotação em <30 seg, zero pedidos perdidos, 19 horas/mês de tempo liberado.

## Contexto

ABC é família de 3 pessoas que virou distribuidora nos últimos 10 anos. Vendem alimentos e bebidas pra pequenos mercados de São Paulo. 5 operadores, todas mulheres, idade média 35 anos. Não têm TI dedicada.

## O Problema

O fluxo era:
1. Cliente envia pedido no WhatsApp
2. Operadora anota em caderno o CEP e o peso
3. Abre site da Melhor Envio
4. Cota
5. Volta ao WhatsApp e fala o preço
6. Abre planilha Excel pra criar pedido
7. Envia pro gestor por e-mail
8. No final do dia, liga pra transportadora pra saber se foi

Isso tudo levava ~12 minutos por pedido. Com 120 pedidos/mês, eram 20 horas/mês só em cotação.

Além disso, com demora pra responder (cliente mandava 14h, operadora só respondia 15h), perdia ~10 pedidos/mês pra concorrência.

O gestor não sabia quantos pedidos estavam "abertos" (vendidos mas não saíram). Descobria quando cliente ligava cobrando.

## A Solução

Colocamos todas as 5 operadoras no CONDSTORE OS. Em uma hora de treinamento coletivo, mostramos:
1. Mensagem chega no WhatsApp → aparece no inbox
2. Abrem conversa → histórico do cliente ao lado
3. Clicam "Cotar" → 2 segundos depois, 3 opções de frete aparecem
4. Selecionam a melhor → clicam "Criar Pedido"
5. Pronto

Tudo em 1 tela. Nenhuma abra extra.

## O Resultado

| Métrica | Antes | Depois | Melhoria |
|---|---|---|---|
| Tempo/cotação | 12 min | 28 seg | ↓ 97% |
| Ferramentas | 4 | 1 | ↓ 75% |
| Pedidos/dia | 24 | 24 | = (mesma quantidade, mais rápido) |
| Pedidos perdidos/mês | 10 | 1 | ↓ 90% |
| Horas liberadas/mês | — | 19 h | = R$ 760 |

## Depoimento

"Pra mim foi tipo libertar a gente de fazer coisa chata. Agora eu coto no mesmo lugar que tô conversando com o cliente. Não abre aba, não fica confuso. Antes eram 12, 15 minutos pra cotação. Agora são 30 segundos." — Juliana, Operadora, ABC

## Timeline

Dia 1: Onboarding, treinamento
Semana 1: 15 cotações, 5 pedidos criados
Semana 2: 18 cotações, 4 pedidos criados
Semana 3: 22 cotações, 6 pedidos criados
Semana 4: 28 cotações, 7 pedidos criados
Total: 83 cotações, 22 pedidos criados, zero erros críticos

## O que funcionou

1. Simplicidade do fluxo. Operadora que não tem experiência com tech pegou em 10 minutos.
2. Velocidade. Ela viu que era possível cotar rápido e voltou pro foco dela que é vender.
3. Suporte próximo. A gente tava lá sexta-feira toda semana, tirava dúvida na hora.

## O que foi desafio

Desafio: Operadora mais velha teve dificuldade na primeira semana, queria voltar pra planilha.
Solução: Colocamos ela junto com outra operadora mais nova por 3 dias. Depois funcionou.

Desafio: Melhor Envio estava instável numa segunda, ninguém conseguia cotar.
Solução: Liberamos tabela de fallback (tabela de preços própria) que foi embora muito rápido.

## Lições

- Operadora não é técnica — treinamento precisa ser bem visual, não verbal
- Suporte semanal (sexta) é obrigação nos 2 primeiros meses — sem isso, desiste
- Liberar operadora pra vender (o foco real delas) é a proposta de valor número 1
- Operadora quer ver resultado no mesmo dia — se não vir, desconfia

## Conclusão

ABC continua com CONDSTORE OS por 12 meses. Contratou plano Essencial. Planejam adicionar 2 novos operadores no próximo trimestre, ambos já com CONDSTORE OS desde o primeiro dia.

```

---

## Dicas finais de redação

- **Números reais:** Não invente. Se não tiver dado exato, deixe em branco e preencha depois.
- **Depoimento autêntico:** Capture a fala natural do cliente, não polida. "Pra mim foi tipo libertar a gente" é melhor que "permitiu-me otimizar o workflow".
- **Legibilidade:** Máximo 3 linhas por parágrafo. Bullet points onde couber.
- **Foco:** Leia o case study de novo. Se menciona Frank, IA, automação ou integração — delete. Não faz parte do MVP.
- **Tamanho:** Leitura completa deve levar 3–5 minutos.
