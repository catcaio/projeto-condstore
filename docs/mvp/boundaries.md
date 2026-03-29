# MVP CONDSTORE OS — Limites explícitos

**Descrição:** O que está fora do escopo do MVP. Claro, sem ambiguidade.

---

## Princípio fundamental

O MVP é **supervisionado e operador-cêntrico**. Tudo que contradiz este princípio está fora.

---

## Bloqueios principais

### 1. ERP e integração sistêmica

**O que está fora:**
- Integração com ERP (SAP, Totvs, Systemos, Protheus, etc.)
- Sincronização bidirecional com sistema legado
- API para terceiros inserir dados
- Webhook para receber mudanças de estoque

**Por quê:**
Cada cliente tem seu próprio ERP com fluxo completamente diferente. Forçar integração criaria infinitas variantes.

**O que fazer em vez disso:**
- CONDSTORE OS é ferramenta operacional standalone
- Dados saem por export ou relatório (se demandado em roadmap futuro)
- Cliente copia dados manualmente entre sistemas (caro, mas claro)

**Risco se ignorar:**
- Cada cliente vira caso especial
- Roadmap congelado em customizações
- Churn por impossibilidade técnica

---

### 2. Automação completa sem supervisão

**O que está fora:**
- Respostas automáticas no WhatsApp baseadas em intenção do cliente
- Cotações geradas e enviadas sem operador aprovar
- Pedidos criados automaticamente da conversa do cliente
- Playbooks que executam ações sobre os dados

**Por quê:**
Automação errada = perda de cliente. Operador humano deve estar no centro de cada decisão crítica.

**O que fazer em vez disso:**
- Sistema sugere (quando Frank for ativado em outro lote)
- Operador aprova
- Sistema executa com auditoria completa

**Risco se ignorar:**
- Primeira resposta errada = churn no primeiro mês
- Reputação danificada por automação que não entende contexto
- Impossível rastrear quem autorizou cada ação

---

### 3. IA autônoma / Frank runtime

**O que está fora:**
- Frank respondendo mensagens automaticamente no WhatsApp
- Sugestões pré-preenchidas que saem sem clique do operador
- Detecção de intenção executando ações diretas
- Conhecimento RAG alimentando sugestões
- Playbooks operacionais rodando sem aprovação

**Estrutura atual:**
- Frank infrastructure existe (`src/modules/frank/`)
- `FRANK_RUNTIME_ENABLED=false` no MVP
- `whatsapp-orchestrator.ts` não é chamado
- Cockpit de Frank desligado para operação determinística

**Por quê:**
Lote 1 é sobre validar o fluxo operacional manual. IA vem depois que a operação básica está sólida.

**Risco se ignorar:**
- Cliente vira teste de IA em vez de ferramenta de vendas
- Expectativa errada criada na venda
- Churn quando cliente descobre que operador ainda precisa aprovar tudo

---

### 4. Marketplace e integrações de canal

**O que está fora:**
- Integração com Mercado Livre, Shopee, Amazon
- Recebimento de pedidos de múltiplos canais
- Sincronização de estoque entre canais
- Unified inbox de múltiplos canais

**Por quê:**
MVP é WhatsApp puro. Cada marketplace tem regras completamente diferentes.

**O que fazer em vez disso:**
- WhatsApp é o único canal operacional no Lote 1
- Se cliente vende em marketplace, ele copia o pedido para o CONDSTORE OS manualmente

**Risco se ignorar:**
- Cada channel vira caso especial
- Operação fica mais complexa, não mais simples

---

### 5. Gestão de estoque

**O que está fora:**
- Integração com WMS (warehouse management system)
- Verificação automática de disponibilidade
- Bloqueio de venda por falta de estoque
- Reserva automática de items

**Por quê:**
MVP é sobre fechamento de venda e despacho. Estoque é um sistema completamente separado.

**O que fazer em vez disso:**
- Operador verifica estoque em outro sistema e responde cliente
- Se houver demanda, integrações vêm depois

---

### 6. Nota Fiscal e faturamento

**O que está fora:**
- Emissão de NF-e ou RPS
- Integração com sistema fiscal (Sefaz, RFB)
- Cálculo de impostos
- Registro em livro de faturamento

**Por quê:**
Cada estado tem regras diferentes. Faturamento precisa de especialista fiscal, não software genérico.

**O que fazer em vez disso:**
- CONDSTORE OS gera dados: client, items, value
- Cliente usa seu sistema de faturamento para emitir NF
- Integração fiscal é roadmap futuro (se houver demanda)

---

### 7. Gestão de catálogo completa

**O que está fora:**
- Administração completa de produtos com múltiplos atributos
- Foto de produto, descrição rica, variantes
- Sistema de preços por cliente/quantidade
- Promoções e descontos automáticos

**Por quê:**
Catálogo é domínio separado e complexo. MVP foca em processo de venda, não em catálogo.

**O que fazer em vez disso:**
- Operador nomeia o produto na conversa
- Sistema registra como line item no pedido
- Catálogo vira funcionalidade adicional (roadmap)

---

### 8. Disparo de campanhas e marketing

**O que está fora:**
- Disparo em massa de mensagens WhatsApp
- Templates de campanhas
- Agendamento automático de mensagens
- Análise de taxa de abertura / resposta

**Por quê:**
MVP é ferramenta de operação, não de marketing. Campanhas têm que vir de sistema especializado.

**O que fazer em vez disso:**
- Cada conversa é iniciada pelo cliente (inbound puro)
- Operador responde (não envia proativo)
- Campanha é roadmap futuro (fora do Lote 1)

---

## Garantias explícitas: O que NUNCA vai entrar

| Item | Por quê | Quando poder discutir |
|---|---|---|
| **ERP integrado** | Cada cliente tem fluxo diferente | Quando temos 10+ clientes validando padrão |
| **Automação total** | Operador no centro | Quando operação manual está 100% validada |
| **Frank runtime ativo** | Lote 1 é sobre validação manual | Próximo lote (depois de 6+ meses em produção) |
| **RAG/Knowledge** | Dependência de AI provider | Quando Frank estiver estável |
| **Marketplace** | Regras diferentes por plataforma | Quando WhatsApp for 100% resolvido |
| **Estoque** | Domínio separado | Quando temos 5+ clientes pedindo |
| **Nota Fiscal** | Complexidade regulatória | Quando houver padrão entre clientes |

---

## Linguagem para quando cliente pede algo fora do MVP

**Se pedir ERP:**
> "CONDSTORE OS é ferramenta operacional, não de integração sistêmica. Para seu ERP, você exporta os dados do nosso sistema ou copia manualmente. Quando temos 10+ clientes com padrão similar, podemos discutir integração."

**Se pedir automação:**
> "O sistema não responde pelo seu operador. Ele ganha velocidade — cotação de 15 min passa para 30 segundos — mas quem aprova tudo é o operador. Isso é controle, não limitação."

**Se pedir IA:**
> "Temos infraestrutura de IA pronta, mas desligada propositalmente no Lote 1. Automação que falha custa mais que a economia. Quando a operação manual estiver 100% validada, ligamos a IA."

**Se pedir marketplace:**
> "Focamos em WhatsApp porque é onde vocês vendem. Marketplace é outro universo. Se demorar muito para resolver WhatsApp puro, a gente evoluiu para marketplace."

**Se pedir estoque:**
> "Estoque é um sistema completamente diferente. CONDSTORE OS foca em venda e despacho. Se precisar saber estoque, consulta seu sistema próprio e responde no WhatsApp."

---

## Checklist: Como saber se algo está fora do MVP

Responda SIM a qualquer uma? Está fora:

- [ ] Requer integração com sistema externo (ERP, marketplace, etc.)?
- [ ] Requer automação que executa ações sem operador aprovar?
- [ ] Requer rodas de IA sem supervisão humana?
- [ ] Requer mudanças no schema de dados fundamental?
- [ ] Requer novo tipo de usuário ou papél?
- [ ] Requer novo carrier ou forma de cotação?
- [ ] Requer novo canal de atendimento?
- [ ] Tira o operador do centro da decisão?

Se respondeu SIM, discuta em roadmap futuro. MVP é o que existe hoje: WhatsApp → cotação → pedido → logística.
