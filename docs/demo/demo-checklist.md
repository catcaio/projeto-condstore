# Demo — Checklist oficial

**Usar antes, durante e depois de cada demonstração.**

---

## Antes da demo

### Ambiente

- [ ] Cockpit acessível em produção ou staging estável
- [ ] Login do usuário de demo funcionando (`demo@condstore.io` ou equivalente)
- [ ] Sessão ativa — sem expiração prevista nos próximos 60 minutos
- [ ] Tenant de demo configurado e isolado de dados reais

### Dados (dataset de demo)

- [ ] Cliente "Carlos Andrade — Construdis" existe no sistema
- [ ] Histórico de 3 pedidos carregado e com status DELIVERED
- [ ] CEP 13480-000 (Limeira/SP) reconhecido pelo motor de frete
- [ ] Carrier Movvi ativo e com tabela de frete carregada
- [ ] Carrier Braspress ativo e com tabela de frete carregada
- [ ] Melhor Envio API com token válido (ou tabela de fallback ativa)

### WhatsApp

- [ ] Número Twilio configurado e recebendo mensagens
- [ ] Celular com número de WhatsApp pessoal pronto para enviar mensagem no início da demo
- [ ] Testar: enviar mensagem de teste e confirmar que aparece no inbox

### Tela e apresentação

- [ ] Cockpit aberto no browser (não em aba oculta — visível)
- [ ] Zoom/resolução adequada para o cliente ver claramente
- [ ] Abas desnecessárias fechadas
- [ ] Notificações do sistema operacional desativadas (não-disturb)
- [ ] Se demo remota: compartilhamento de tela testado e funcionando

### Conectividade

- [ ] Internet estável (evitar WiFi de 2.4GHz — preferir cabo ou 5GHz)
- [ ] Se demo remota: microfone e câmera testados

---

## Durante a demo

### Fluxo obrigatório (seguir nesta ordem)

- [ ] **Etapa 1:** Mensagem WhatsApp chegando ao vivo no inbox
- [ ] **Etapa 2:** Abrir conversa e mostrar histórico do cliente
- [ ] **Etapa 3:** Clicar em "Pedir cotação"
- [ ] **Etapa 4:** Mostrar 3 opções de carrier com preço e prazo
- [ ] **Etapa 5:** Selecionar Movvi e criar pedido
- [ ] **Etapa 6:** Navegar para aba de logística e mostrar pedido na fila
- [ ] **Etapa 7:** Mostrar painel do gestor com métricas gerais
- [ ] **Fechamento:** Fazer pergunta de piloto

### Pausas obrigatórias para o cliente falar

- [ ] Após mostrar histórico: *"Hoje seu operador sabe disso antes de responder?"*
- [ ] Após cotação em segundos: *"Antes levava quantos minutos?"*
- [ ] Na visão do gestor: *"Você tem essa visibilidade hoje de forma instantânea?"*
- [ ] No fechamento: *"Quantos pedidos vocês processam por mês?"*

### Controle de tempo

| Etapa | Tempo máximo |
|---|---|
| Abertura (antes de entrar no sistema) | 3 min |
| Etapas 1–6 (fluxo completo) | 10 min |
| Visão do gestor | 3 min |
| Fechamento e convite piloto | 5 min |
| **Total** | **21 min** |

---

## O que NÃO mostrar

### Telas proibidas na demo

- ❌ Qualquer tela de configuração técnica (webhooks, tokens, integrações)
- ❌ Tela de admin de banco de dados
- ❌ Console ou terminal
- ❌ Painel de usuários e permissões (exceto se cliente perguntar — mostrar brevemente)
- ❌ Qualquer feature que não esteja no fluxo dos 7 passos

### Assuntos proibidos durante a demo

- ❌ Automação de respostas (não existe no MVP)
- ❌ IA que responde sozinha
- ❌ Integrações com ERP
- ❌ Catálogo de produtos completo
- ❌ Nota fiscal
- ❌ Campanhas de WhatsApp
- ❌ Roadmap futuro ("vamos ter isso em breve")
- ❌ Percentuais de melhoria sem base em dados reais do cliente

### Se o cliente perguntar algo que não existe

Resposta padrão:
> "Isso não está no produto hoje. O que temos cobre o fluxo de [WhatsApp → cotação → pedido]. Se isso é importante para vocês, anotamos para entender a prioridade."

Não prometa, não mencione roadmap.

---

## Durante problemas técnicos

### Carrier API timeout (Melhor Envio lenta)

**Problema:** Cotação demora mais de 10 segundos
**Ação:** "A API externa de um carrier está um pouco lenta. Veja que os carriers de tabela já responderam — Movvi e Braspress. Seguimos com esses."

### WhatsApp não aparece no inbox

**Problema:** Mensagem enviada não aparece
**Ação:** Atualizar a página (F5). Se persistir: mostrar uma mensagem já existente no histórico e explicar o fluxo. Resolver depois da demo.

### Sistema lento ou fora

**Problema:** Cockpit não carrega
**Ação:** Pausar, verificar conexão. Se persistir em 2 minutos: "Temos um contratempo técnico pontual. Posso mostrar o fluxo em vídeo gravado e marcar uma nova sessão para demo ao vivo."

*(Manter vídeo de 3 min gravado como fallback — ver demo-script.md)*

### Valores de frete muito diferentes

**Problema:** Valores reais diferem muito do dataset
**Ação:** Adaptar a fala — "Os valores variam por tabela e CEP, mas o importante é ver as 3 opções lado a lado em segundos. Antes isso levava [X] minutos."

---

## Depois da demo

### Próximos passos imediatos

- [ ] Perguntar e anotar: quantos pedidos/mês, quantos operadores, tempo atual de cotação
- [ ] Propor piloto de 30 dias (remunerado)
- [ ] Definir data para sessão de onboarding (meta: semana seguinte)
- [ ] Enviar resumo por escrito: o que foi mostrado, o que o cliente pode esperar do piloto

### Dados para registro interno

- [ ] Anotar respostas às perguntas de dor
- [ ] Anotar objeções levantadas durante a demo
- [ ] Registrar se o cliente é fit ou no-fit (ref: `docs/mvp/mvp-definition.md` — seção ICP)
- [ ] Registrar status: piloto aceito / precisa de mais info / descartado

### Limpeza do ambiente

- [ ] Excluir pedido criado durante a demo (para não sujar histórico)
- [ ] Resetar stage do cliente para o estado pré-demo
- [ ] Confirmar que dados de demo estão prontos para próxima apresentação
