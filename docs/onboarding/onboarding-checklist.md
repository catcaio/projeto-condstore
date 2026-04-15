# Onboarding — Checklist completo de implantação

**Executar nesta ordem. Não avançar para o próximo bloco sem completar o anterior.**

---

## BLOCO 0 — Pré-requisitos (antes do dia 1)

### Dados do cliente

- [ ] Recebeu formulário preenchido (`onboarding-data-required.md`)
- [ ] CNPJ validado
- [ ] CEP de origem validado (CEP real, formato 8 dígitos)
- [ ] Número WhatsApp confirmado e ativo
- [ ] Pelo menos 1 carrier disponível (tabela ou Melhor Envio token)
- [ ] Lista de usuários com papéis definidos
- [ ] Contato técnico do cliente confirmado e disponível

### Twilio / WhatsApp (iniciar com antecedência)

- [ ] Conta Twilio criada (própria do cliente ou usando conta da operação)
- [ ] Número WhatsApp solicitado na conta Twilio
- [ ] Aprovação Meta/WhatsApp Business recebida *(pode levar 1–3 dias úteis)*
- [ ] Webhook URL configurada no Twilio: `https://[dominio]/api/whatsapp/incoming`
- [ ] Teste de webhook: enviar mensagem e confirmar recebimento no log

---

## BLOCO 1 — Criação do tenant

- [ ] Acessar painel admin (`/api/internal/` com token de admin)
- [ ] Criar registro do tenant com:
  - [ ] Nome (razão social ou fantasia)
  - [ ] Slug único (sem espaços, ex: `construdis`)
  - [ ] CNPJ
  - [ ] Plano inicial definido (Starter para piloto)
- [ ] Confirmar que tenant está com status `unlocked`
- [ ] Confirmar isolamento: tenant ID gerado e único

**Validação:**
> Acessar `/api/health` com `x-auth-tenant-id: [id]` — deve retornar 200.

---

## BLOCO 2 — Conexão WhatsApp (Twilio)

- [ ] `TWILIO_ACCOUNT_SID` configurado no ambiente do tenant
- [ ] `TWILIO_AUTH_TOKEN` configurado
- [ ] Número Twilio associado ao tenant
- [ ] Webhook configurado e ativo no Twilio console
- [ ] Validação de assinatura habilitada (não desativar)

**Teste obrigatório:**
- [ ] Enviar mensagem de teste para o número do cliente
- [ ] Confirmar que aparece no inbox do cockpit dentro de 10 segundos
- [ ] Confirmar que operador vê a mensagem com identidade do cliente correta

---

## BLOCO 3 — Configuração de carriers

### Melhor Envio (se o cliente tiver token)

- [ ] Token Melhor Envio configurado no tenant
- [ ] Teste: solicitar cotação para um CEP válido
- [ ] Confirmar que retorna opções com preço e prazo
- [ ] Confirmar timeout < 5 segundos (se exceder, ajustar configuração)

### Carriers de tabela (Movvi, Mengue, Braspress ou próprios)

Para cada carrier com tabela:

- [ ] Arquivo de tabela recebido do cliente
- [ ] Formato validado (colunas CEP/zona, peso, valor, prazo)
- [ ] Tabela importada no banco (`carrier_rate_rows`)
- [ ] Zonas geográficas configuradas (`carrier_zones`)
- [ ] Política do carrier criada (`carrier_policies`)

**Teste por carrier:**
- [ ] Simular cotação com CEP de destino conhecido
- [ ] Confirmar que retorna valor e prazo dentro do esperado pela tabela

### CEP de origem

- [ ] `ORIGIN_CEP` configurado com o CEP de despacho do cliente
- [ ] Formato validado: 8 dígitos sem traço

---

## BLOCO 4 — Criação de usuários

Para cada usuário da lista:

- [ ] Criar conta com e-mail fornecido
- [ ] Atribuir papel correto (operador / gerente / admin)
- [ ] Vincular ao tenant correto
- [ ] Enviar e-mail de boas-vindas com link de acesso e instruções
- [ ] Confirmar que usuário consegue fazer login
- [ ] Confirmar que usuário vê apenas os dados do tenant dele (isolamento)

**Validação de acesso:**
- [ ] Admin: consegue acessar configurações do workspace
- [ ] Gerente: vê painel de pedidos e métricas
- [ ] Operador: vê inbox e consegue abrir conversa

---

## BLOCO 5 — Validação de fluxo ponta a ponta

Executar com operador do cliente presente (ou com conta de teste):

- [ ] **Passo 1:** Enviar mensagem WhatsApp para o número do cliente
- [ ] **Passo 2:** Confirmar que aparece no inbox do cockpit
- [ ] **Passo 3:** Abrir conversa — histórico vazio é esperado (cliente novo)
- [ ] **Passo 4:** Clicar "Pedir cotação" — preencher CEP de destino real
- [ ] **Passo 5:** Confirmar que retorna pelo menos 1 opção de carrier
- [ ] **Passo 6:** Selecionar carrier e clicar "Criar pedido"
- [ ] **Passo 7:** Confirmar que pedido aparece na fila de logística
- [ ] **Passo 8:** Confirmar que status do pedido é CREATED
- [ ] **Passo 9:** Confirmar que cliente aparece no módulo de Clientes

**Resultado esperado:** fluxo completo sem erro em menos de 5 minutos.

Se qualquer passo falhar → não avançar para treinamento. Resolver primeiro.

---

## BLOCO 6 — Treinamento do operador

- [ ] Sessão de treinamento agendada com operadores principais (30–60 min)
- [ ] Demonstrar o fluxo completo ao vivo no ambiente real do cliente
- [ ] Operador executa o fluxo sozinho ao menos 1 vez durante o treinamento
- [ ] Perguntas respondidas
- [ ] Material de referência enviado: link para `docs/mvp/cockpit-map.md`

**Tópicos obrigatórios do treinamento:**

| Tópico | Minutos |
|---|---|
| Inbox WhatsApp — como funciona | 5 min |
| Como solicitar cotação | 5 min |
| Como criar pedido | 5 min |
| Fila de logística | 5 min |
| Visão do gestor | 5 min |
| Dúvidas | 10 min |

---

## BLOCO 7 — Início assistido da operação

- [ ] Operador começa a usar o sistema com pedidos reais
- [ ] Responsável CONDSTORE OS disponível por WhatsApp/Slack nas primeiras 48h
- [ ] Canal de suporte do piloto criado (ex: grupo WhatsApp ou canal Slack)
- [ ] Combinar check-in diário nas primeiras 48h (vide `onboarding-48h-plan.md`)

---

## BLOCO 8 — Aceite do piloto

Verificar critérios em `onboarding-acceptance.md`.

- [ ] Cliente recebeu pelo menos 5 mensagens via WhatsApp no sistema
- [ ] Pelo menos 2 cotações geradas com sucesso
- [ ] Pelo menos 1 pedido criado com sucesso
- [ ] Gestor acessou painel pelo menos 1 vez
- [ ] Nenhum erro crítico não resolvido em aberto

**Se aceite confirmado:**
- [ ] Registrar data de início oficial do piloto
- [ ] Agendar revisão de 30 dias (`onboarding-acceptance.md` — seção de revisão)

---

## Resumo de responsabilidades

| Bloco | Responsável | Participação do cliente |
|---|---|---|
| 0 — Pré-requisitos | CONDSTORE OS | Enviar dados do formulário |
| 1 — Tenant | CONDSTORE OS | — |
| 2 — WhatsApp | CONDSTORE OS | Acesso à conta Twilio (se existente) |
| 3 — Carriers | CONDSTORE OS | Enviar tabelas de frete |
| 4 — Usuários | CONDSTORE OS | Confirmar lista de usuários |
| 5 — Validação E2E | CONDSTORE OS + cliente | Presente para testar |
| 6 — Treinamento | CONDSTORE OS | Operadores participam |
| 7 — Início assistido | CONDSTORE OS | Opera o sistema |
| 8 — Aceite | CONDSTORE OS + cliente | Confirma funcionamento |
