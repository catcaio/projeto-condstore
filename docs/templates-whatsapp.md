# Templates WhatsApp (Twilio)

Estes templates devem ser aprovados no painel do Twilio (Integrations > WhatsApp > Message Templates) antes de iniciar disparos fora da janela de 24 horas.

## 1. REENGAGE_FRETE
**Categoria:** Marketing / Utility
**Idioma:** `pt_BR`

**Corpo (Body):**
```text
Olá! Vimos que você estava cotando fretes recentemente, mas não finalizou. 🚚
Podemos ajudar com alguma dúvida sobre as transportadoras ou prazos? Responda com "Cotação" se quiser retomar!
```

## 2. STATUS_PEDIDO
**Categoria:** Utility
**Idioma:** `pt_BR`

**Corpo (Body):**
```text
Olá {{1}}! Seu pedido na Lojacond teve uma atualização. 📦
O status atual é: *{{2}}*.
Acompanhe seu código de rastreio: {{3}}
Qualquer dúvida, é só responder esta mensagem!
```

## 3. PEDIR_DADOS
**Categoria:** Utility
**Idioma:** `pt_BR`

**Corpo (Body):**
```text
Aqui é do time da Lojacond! Para seguirmos com o seu atendimento, por favor, me confirme o seu CEP de entrega. 📍
Basta digitar apenas os 8 números.
```
