# Arquitetura do Sistema - Lojacond Frete Automação

**Autor:** Manus AI  
**Data:** 12 de Fevereiro de 2026  
**Versão:** 2.0 (Arquitetura Profissional)

---

## Visão Geral

O **Lojacond Frete Automação** é um framework conversacional profissional, modular e escalável, projetado para automatizar cotações de frete via WhatsApp (Twilio). A arquitetura foi desenvolvida com foco em **separação de responsabilidades**, **extensibilidade** e **produção-ready**.

Este sistema não é apenas uma automação de frete — é uma **base reutilizável** para qualquer fluxo conversacional futuro, incluindo rastreamento de pedidos, status de pagamento, segunda via de boleto e atendimento humano.

---

## Princípios Arquiteturais

A arquitetura segue os seguintes princípios fundamentais:

1. **Separação de Responsabilidades**: Cada camada tem uma responsabilidade clara e bem definida.
2. **Desacoplamento**: Providers, serviços e controladores são independentes e podem ser substituídos sem impacto no restante do sistema.
3. **Extensibilidade**: Novos módulos, intents e providers podem ser adicionados sem refatoração massiva.
4. **Observabilidade**: Logging estruturado e rastreamento de estado em todos os pontos críticos.
5. **Resiliência**: Retry automático, fallbacks e tratamento de erros em todas as camadas.
6. **Type Safety**: Tipagem forte em TypeScript para prevenir erros em tempo de compilação.

---

## Estrutura de Diretórios

```
src/
├── app/
│   └── api/
│       └── webhook/
│           └── route.ts                # Webhook Twilio (entry point)
├── core/
│   └── conversation/
│       ├── state-machine.ts            # Máquina de estados formal
│       ├── session-manager.ts          # Gerenciamento de sessão (Redis + fallback)
│       ├── intent-classifier.ts        # Classificador de intenções
│       └── __tests__/                  # Testes unitários
├── modules/
│   └── freight/
│       ├── freight.types.ts            # Tipos do módulo de frete
│       ├── freight.service.ts          # Lógica de negócio de frete
│       └── freight.controller.ts       # Controlador de frete (orquestração)
├── providers/
│   ├── twilio.provider.ts              # Provider Twilio (desacoplado)
│   └── melhorenvio.provider.ts         # Provider Melhor Envio (desacoplado)
├── infra/
│   ├── redis.client.ts                 # Cliente Redis tipado
│   ├── logger.ts                       # Sistema de logging estruturado
│   └── errors.ts                       # Sistema de erros estruturado
└── config/
    ├── app.config.ts                   # Configuração central da aplicação
    ├── twilio.config.ts                # Configuração do Twilio
    └── melhorenvio.config.ts           # Configuração do Melhor Envio
```

---

## Camadas da Arquitetura

### 1. **Camada de Entrada (Entry Point)**

**Arquivo:** `src/app/api/webhook/route.ts`

Responsabilidade: Receber requisições HTTP do Twilio e delegar o processamento para o controlador.

**Características:**
- Thin layer: não contém lógica de negócio.
- Parse de payload do Twilio.
- Geração de resposta TwiML.
- Tratamento de erros global.

**Fluxo:**
```
Twilio → POST /api/webhook → Parse payload → freightController.processMessage() → TwiML response
```

---

### 2. **Camada de Controle (Controller)**

**Arquivo:** `src/modules/freight/freight.controller.ts`

Responsabilidade: Orquestrar o fluxo conversacional, coordenando State Machine, Session Manager e Freight Service.

**Características:**
- Recebe mensagem do usuário.
- Classifica intenção via Intent Classifier.
- Gerencia transições de estado via State Machine.
- Persiste sessão via Session Manager.
- Delega cálculo de frete para Freight Service.
- Retorna resposta formatada para o usuário.

**Decisão Técnica:** O controlador **não** contém lógica de negócio. Ele apenas orquestra.

---

### 3. **Camada de Negócio (Service)**

**Arquivo:** `src/modules/freight/freight.service.ts`

Responsabilidade: Implementar a lógica de negócio de cálculo de frete.

**Características:**
- Validação de CEP e quantidade.
- Decisão de estratégia baseada em peso (≤10kg, 10-15kg, >15kg).
- Orquestração de providers (Melhor Envio e Tabela).
- Ordenação e limitação de opções de frete.
- Formatação de resposta para o usuário.

**Decisão Técnica:** A lógica de decisão por peso está encapsulada no serviço, facilitando mudanças futuras nas regras de negócio.

---

### 4. **Camada de Conversação (Conversation Core)**

**Arquivos:**
- `src/core/conversation/state-machine.ts`
- `src/core/conversation/session-manager.ts`
- `src/core/conversation/intent-classifier.ts`

#### 4.1. **State Machine**

Responsabilidade: Gerenciar o fluxo conversacional com uma máquina de estados formal.

**Estados:**
- `IDLE`: Sem conversa ativa.
- `AWAITING_CEP`: Aguardando CEP do usuário.
- `AWAITING_QUANTITY`: Aguardando quantidade.
- `CALCULATING`: Processando cálculo de frete.
- `COMPLETED`: Conversa concluída.
- `ERROR`: Estado de erro.

**Eventos:**
- `START_FREIGHT_QUERY`: Iniciar cotação.
- `CEP_PROVIDED`: CEP fornecido.
- `QUANTITY_PROVIDED`: Quantidade fornecida.
- `CALCULATION_SUCCESS`: Cálculo bem-sucedido.
- `CALCULATION_ERROR`: Erro no cálculo.
- `RESET`: Reiniciar conversa.
- `ERROR`: Erro genérico.

**Transições:**
```
IDLE → START_FREIGHT_QUERY → AWAITING_CEP
AWAITING_CEP → CEP_PROVIDED → AWAITING_QUANTITY
AWAITING_QUANTITY → QUANTITY_PROVIDED → CALCULATING
CALCULATING → CALCULATION_SUCCESS → COMPLETED
CALCULATING → CALCULATION_ERROR → ERROR
* → RESET → IDLE
```

**Decisão Técnica:** A State Machine é **extensível**. Novos estados e eventos podem ser adicionados sem impactar os existentes.

#### 4.2. **Session Manager**

Responsabilidade: Gerenciar sessões de usuários com persistência Redis e fallback em memória.

**Características:**
- Persistência primária: Upstash Redis (REST API).
- Fallback: In-memory store.
- TTL configurável (padrão: 30 minutos).
- Operações tipadas: `getSession`, `createSession`, `updateSession`, `deleteSession`.
- Cleanup automático de sessões expiradas.

**Decisão Técnica:** O fallback em memória garante que o sistema continue funcionando mesmo se o Redis estiver indisponível.

#### 4.3. **Intent Classifier**

Responsabilidade: Classificar mensagens do usuário em intenções (intents).

**Intenções Suportadas:**
- `FREIGHT_QUERY`: Cotação de frete.
- `PROVIDE_CEP`: Fornecimento de CEP.
- `PROVIDE_QUANTITY`: Fornecimento de quantidade.
- `RESET`: Reiniciar conversa.
- `HELP`: Ajuda.
- `CANCEL`: Cancelar.
- `TRACK_ORDER`: Rastreamento (futuro).
- `PAYMENT_STATUS`: Status de pagamento (futuro).
- `HUMAN_SUPPORT`: Atendimento humano (futuro).
- `UNKNOWN`: Intenção desconhecida.

**Extração de Dados:**
- CEP: Regex para formatos `01001-000` ou `01001000`.
- Quantidade: Regex para números de 1 a 9999.

**Decisão Técnica:** O classificador é baseado em regras (rule-based), mas pode ser substituído por um modelo de ML no futuro sem impactar o restante do sistema.

---

### 5. **Camada de Providers**

**Arquivos:**
- `src/providers/twilio.provider.ts`
- `src/providers/melhorenvio.provider.ts`

Responsabilidade: Encapsular toda a comunicação com APIs externas.

**Características:**
- Desacoplamento total: nenhuma chamada HTTP direta no código de negócio.
- Retry automático com exponential backoff.
- Timeout configurável.
- Tratamento de erros tipado.
- Health checks.

**Decisão Técnica:** Providers são **singleton instances**, garantindo que configurações sejam carregadas uma única vez.

---

### 6. **Camada de Infraestrutura**

**Arquivos:**
- `src/infra/redis.client.ts`
- `src/infra/logger.ts`
- `src/infra/errors.ts`

#### 6.1. **Redis Client**

Responsabilidade: Cliente Redis tipado e seguro.

**Características:**
- Operações tipadas: `get<T>`, `set<T>`, `delete`, `exists`, `ttl`.
- Retry automático (até 2 tentativas).
- Timeout de 5 segundos.
- Fallback gracioso quando Redis está indisponível.

#### 6.2. **Logger**

Responsabilidade: Logging estruturado em JSON.

**Níveis de Log:**
- `DEBUG`: Informações de depuração.
- `INFO`: Informações gerais.
- `WARN`: Avisos.
- `ERROR`: Erros.

**Características:**
- Output em JSON estruturado.
- Mascaramento de dados sensíveis (telefone).
- Métodos especializados: `http()`, `stateTransition()`.

#### 6.3. **Errors**

Responsabilidade: Sistema de erros estruturado.

**Tipos de Erros:**
- `BaseError`: Classe base para todos os erros.
- `InfrastructureError`: Erros de infraestrutura (Redis, etc.).
- `ProviderError`: Erros de providers (Twilio, Melhor Envio).
- `BusinessError`: Erros de lógica de negócio.

**Características:**
- Códigos de erro tipados (`ErrorCode` enum).
- Mensagens amigáveis para o usuário (`userFacingMessages`).
- Flag `isRetryable` para indicar se o erro pode ser retentado.
- Contexto adicional para debugging.

---

### 7. **Camada de Configuração**

**Arquivos:**
- `src/config/app.config.ts`
- `src/config/twilio.config.ts`
- `src/config/melhorenvio.config.ts`

Responsabilidade: Centralizar toda a configuração da aplicação.

**Características:**
- Tipagem forte: todas as configurações são tipadas.
- Validação em tempo de inicialização.
- Nenhum `process.env` espalhado pelo código.
- Valores padrão para desenvolvimento.

**Decisão Técnica:** A configuração é carregada uma única vez no início da aplicação, evitando leituras repetidas de variáveis de ambiente.

---

## Fluxo de Dados

### Fluxo Completo de Cotação de Frete

```
1. Twilio envia POST /api/webhook
   ↓
2. Webhook parse payload e extrai mensagem
   ↓
3. freightController.processMessage()
   ↓
4. sessionManager.getSession() ou createSession()
   ↓
5. intentClassifier.classify(message)
   ↓
6. stateMachine.transition(context, event)
   ↓
7. sessionManager.updateSession()
   ↓
8. [Se estado = CALCULATING] freightService.calculateFreight()
   ↓
9. [Decisão de estratégia por peso]
   ↓
10. [Fetch quotes de providers]
    ├─ melhorEnvioProvider.calculateShipping()
    └─ tabelaProvider.calculateShipping()
   ↓
11. [Ordenar e limitar opções]
   ↓
12. freightService.formatOptionsForUser()
   ↓
13. twilioProvider.generateTwiMLResponse()
   ↓
14. Retornar TwiML para Twilio
```

---

## Decisões Técnicas Importantes

### 1. **Por que State Machine?**

Uma máquina de estados formal garante que:
- Todas as transições são explícitas e validadas.
- Não há estados "órfãos" ou transições inválidas.
- O fluxo conversacional é previsível e testável.
- Novos estados podem ser adicionados sem quebrar os existentes.

### 2. **Por que Session Manager com Redis + Fallback?**

- **Redis (Upstash)**: Persistência distribuída, essencial para ambientes serverless (Vercel).
- **Fallback em memória**: Garante que o sistema continue funcionando mesmo se o Redis estiver indisponível.
- **TTL automático**: Sessões expiram automaticamente, evitando acúmulo de dados.

### 3. **Por que Providers Desacoplados?**

- **Testabilidade**: Providers podem ser mockados facilmente em testes.
- **Substituibilidade**: Um provider pode ser substituído sem impactar o restante do sistema.
- **Retry e Timeout**: Lógica de retry e timeout está encapsulada no provider, não espalhada pelo código.

### 4. **Por que Logging Estruturado?**

- **Observabilidade**: Logs em JSON podem ser facilmente ingeridos por ferramentas de monitoramento (Datadog, Sentry, etc.).
- **Rastreamento**: Cada log contém contexto (phoneNumber, estado, etc.), facilitando debugging.

### 5. **Por que Erros Estruturados?**

- **Mensagens Amigáveis**: Erros técnicos são traduzidos para mensagens amigáveis ao usuário.
- **Retry Inteligente**: A flag `isRetryable` permite que o sistema decida automaticamente se deve retentar.
- **Debugging**: Contexto adicional facilita a identificação da causa raiz.

---

## Extensibilidade

### Como Adicionar um Novo Intent (ex: Rastreamento de Pedidos)

1. **Adicionar novo enum em `intent-classifier.ts`:**
   ```typescript
   export enum UserIntent {
     // ...
     TRACK_ORDER = 'TRACK_ORDER',
   }
   ```

2. **Implementar lógica de classificação:**
   ```typescript
   private isTrackingQuery(message: string): boolean {
     const keywords = ['rastrear', 'rastreio', 'onde está'];
     return keywords.some((kw) => message.includes(kw));
   }
   ```

3. **Adicionar handler no `freight.controller.ts`:**
   ```typescript
   if (intent === UserIntent.TRACK_ORDER) {
     return await this.handleTracking(phoneNumber, extractedData);
   }
   ```

4. **Criar novo módulo `src/modules/tracking/`:**
   - `tracking.types.ts`
   - `tracking.service.ts`
   - `tracking.controller.ts`

5. **Adicionar novos estados na State Machine (se necessário):**
   ```typescript
   export enum ConversationState {
     // ...
     AWAITING_ORDER_ID = 'AWAITING_ORDER_ID',
     FETCHING_TRACKING = 'FETCHING_TRACKING',
   }
   ```

### Como Adicionar um Novo Provider (ex: Correios)

1. **Criar `src/providers/correios.provider.ts`:**
   ```typescript
   class CorreiosProvider {
     async calculateShipping(request: ShippingQuoteRequest): Promise<ShippingQuote[]> {
       // Implementação
     }
   }
   export const correiosProvider = new CorreiosProvider();
   ```

2. **Adicionar configuração em `src/config/correios.config.ts`.**

3. **Integrar no `freight.service.ts`:**
   ```typescript
   if (strategy === 'CORREIOS_ONLY') {
     const correiosQuotes = await correiosProvider.calculateShipping(request);
     options.push(...correiosQuotes);
   }
   ```

---

## Testes

### Estratégia de Testes

- **Unit Tests**: Testam componentes isolados (State Machine, Intent Classifier, Providers).
- **Integration Tests**: Testam a integração entre camadas (Controller + Service + Providers).
- **E2E Tests**: Testam o fluxo completo (Webhook → Resposta).

### Testes Implementados

- `src/core/conversation/__tests__/state-machine.test.ts`: Testes da State Machine.
- `src/core/conversation/__tests__/intent-classifier.test.ts`: Testes do Intent Classifier.

### Como Executar Testes

```bash
pnpm test
```

---

## Deploy

### Variáveis de Ambiente Necessárias

```env
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886

# Melhor Envio
MELHORENVIO_TOKEN=your_token
MELHORENVIO_API_URL=https://sandbox.melhorenvio.com.br/api/v2

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Configuração
ORIGIN_CEP=01001000
DEFAULT_UNIT_WEIGHT=0.3
MAX_FREIGHT_OPTIONS=3
SESSION_TTL_MS=1800000
LOG_LEVEL=info
NODE_ENV=production
```

### Deploy na Vercel

1. Conectar repositório GitHub à Vercel.
2. Configurar variáveis de ambiente no painel da Vercel.
3. Deploy automático a cada push na branch `main`.

### Webhook URL

Após o deploy, configurar a URL do webhook no Twilio:
```
https://your-app.vercel.app/api/webhook
```

---

## Monitoramento e Observabilidade

### Logs

Todos os logs são estruturados em JSON e podem ser enviados para ferramentas de monitoramento:
- **Datadog**: Integração via Vercel.
- **Sentry**: Captura de erros em tempo real.
- **Logtail**: Agregação de logs.

### Métricas Recomendadas

- **Latência do Webhook**: Tempo de resposta do webhook.
- **Taxa de Erro**: Porcentagem de requisições que falharam.
- **Taxa de Conversão**: Porcentagem de usuários que completaram a cotação.
- **Uso de Redis**: Hit rate do cache.

---

## Conclusão

A arquitetura do **Lojacond Frete Automação** foi projetada para ser **profissional, modular e escalável**. Ela não é apenas uma solução para cotações de frete, mas uma **base reutilizável** para qualquer fluxo conversacional futuro.

Principais conquistas:
- ✅ Separação clara de responsabilidades.
- ✅ Desacoplamento total entre camadas.
- ✅ Extensibilidade para novos módulos e intents.
- ✅ Resiliência com retry, fallback e tratamento de erros.
- ✅ Observabilidade com logging estruturado.
- ✅ Tipagem forte para prevenir erros.

**Este sistema está pronto para produção e para expansão futura.**

---

**Autor:** Manus AI  
**Contato:** https://manus.im  
**Licença:** MIT
