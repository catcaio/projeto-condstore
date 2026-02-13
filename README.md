# Lojacond Frete Automação

**Framework Conversacional Profissional para WhatsApp**

Automação de cotações de frete via WhatsApp (Twilio) com arquitetura modular, escalável e production-ready.

---

## 🚀 Características

✅ **Arquitetura Limpa**: Separação clara de responsabilidades em camadas.  
✅ **State Machine Formal**: Fluxo conversacional previsível e extensível.  
✅ **Providers Desacoplados**: Twilio e Melhor Envio isolados e substituíveis.  
✅ **Sessão Persistente**: Upstash Redis + fallback em memória.  
✅ **Logging Estruturado**: JSON logs para observabilidade.  
✅ **Tratamento de Erros**: Sistema de erros tipado com mensagens amigáveis.  
✅ **Retry Automático**: Exponential backoff em todas as chamadas externas.  
✅ **Tipagem Forte**: TypeScript para prevenir erros em tempo de compilação.  
✅ **Testes Unitários**: Cobertura de componentes críticos.  
✅ **Extensível**: Pronto para rastreamento, pagamento e atendimento humano.

---

## 📁 Estrutura do Projeto

```
src/
├── app/api/webhook/          # Entry point (Twilio webhook)
├── core/conversation/        # Motor conversacional
│   ├── state-machine.ts      # Máquina de estados
│   ├── session-manager.ts    # Gerenciamento de sessão
│   └── intent-classifier.ts  # Classificador de intenções
├── modules/freight/          # Módulo de frete
│   ├── freight.controller.ts # Orquestração
│   ├── freight.service.ts    # Lógica de negócio
│   └── freight.types.ts      # Tipos
├── providers/                # Providers externos
│   ├── twilio.provider.ts    # Twilio WhatsApp
│   └── melhorenvio.provider.ts # Melhor Envio API
├── infra/                    # Infraestrutura
│   ├── redis.client.ts       # Cliente Redis
│   ├── logger.ts             # Logger estruturado
│   └── errors.ts             # Sistema de erros
└── config/                   # Configuração central
    ├── app.config.ts
    ├── twilio.config.ts
    └── melhorenvio.config.ts
```

---

## 🛠️ Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Executar em desenvolvimento
pnpm dev

# Executar testes
pnpm test

# Verificar TypeScript
pnpm check

# Build para produção
pnpm build
```

---

## 🔧 Variáveis de Ambiente

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

---

## 📊 Fluxo Conversacional

```
Usuário: "frete"
Bot: "Olá! Vou ajudar você a calcular o frete. Qual é o CEP de destino?"

Usuário: "01001-000"
Bot: "CEP recebido! Agora, quantas unidades você deseja?"

Usuário: "5"
Bot: "Aqui estão as melhores opções de frete:

1. Loggi Express - R$ 10,41 - Prazo: 3 dias
2. Jadlog .Package - R$ 14,91 - Prazo: 6 dias
3. JeT Standard - R$ 15,40 - Prazo: 2 dias"
```

---

## 🧪 Testes

```bash
# Executar todos os testes
pnpm test

# Executar testes em watch mode
pnpm test --watch

# Executar testes com cobertura
pnpm test --coverage
```

---

## 🚢 Deploy

### Vercel (Recomendado)

1. Conectar repositório GitHub à Vercel.
2. Configurar variáveis de ambiente no painel da Vercel.
3. Deploy automático a cada push na branch `main`.

### Webhook URL

Após o deploy, configurar a URL do webhook no Twilio:
```
https://your-app.vercel.app/api/webhook
```

---

## 📖 Documentação

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Documentação completa da arquitetura.
- **[TODO.md](./todo.md)**: Checklist de implementação.

---

## 🔮 Roadmap

- [ ] Rastreamento de pedidos
- [ ] Status de pagamento
- [ ] Segunda via de boleto
- [ ] Atendimento humano
- [ ] Dashboard de métricas
- [ ] Integração com WooCommerce
- [ ] Suporte a múltiplos idiomas

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.

---

## 📄 Licença

MIT

---

**Desenvolvido com ❤️ por Manus AI**
