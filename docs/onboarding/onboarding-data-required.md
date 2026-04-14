# Onboarding — Dados obrigatórios do cliente

**Coletar antes de iniciar qualquer configuração técnica.**
Sem esses dados, o setup não pode ser concluído.

---

## 1. Empresa

| Campo | Obrigatório | Formato | Exemplo |
|---|---|---|---|
| Razão Social | ✅ | Texto | Construdis Materiais LTDA |
| Nome fantasia | ✅ | Texto | Construdis |
| CNPJ | ✅ | XX.XXX.XXX/XXXX-XX | 12.345.678/0001-99 |
| Segmento | ✅ | Texto livre | Revenda de materiais de construção |
| Site | ❌ | URL | https://construdis.com.br |

---

## 2. Endereço de origem (despacho)

Usado como ponto de saída em todas as cotações de frete.

| Campo | Obrigatório | Formato | Exemplo |
|---|---|---|---|
| CEP de origem | ✅ | 8 dígitos | 01310-100 |
| Logradouro | ✅ | Texto | Av. Paulista, 1000 |
| Bairro | ✅ | Texto | Bela Vista |
| Cidade | ✅ | Texto | São Paulo |
| Estado | ✅ | UF | SP |
| Complemento | ❌ | Texto | Galpão A |

---

## 3. Número WhatsApp

| Campo | Obrigatório | Formato | Exemplo |
|---|---|---|---|
| Número WhatsApp Business | ✅ | +55 DDD NNNNN-NNNN | +55 11 98765-4321 |
| Está na API do WhatsApp Business? | ✅ | Sim / Não / Preciso de ajuda | Não |
| Tem conta Twilio? | ✅ | Sim / Não | Não |
| WABA ID (se já tiver) | ❌ | Alfanumérico | — |

> **Atenção:** Se o cliente ainda não tiver conta Twilio, o processo de ativação do número WhatsApp via Twilio leva 1–3 dias úteis. Iniciar antes do onboarding.

---

## 4. Carriers utilizados

Para cada carrier que o cliente usa hoje:

| Campo | Obrigatório | Exemplo |
|---|---|---|
| Nome do carrier | ✅ | Movvi |
| Tem tabela de frete (CSV/planilha)? | ✅ | Sim — enviar arquivo |
| Tem conta Melhor Envio? | ✅ | Sim / Não |
| Token Melhor Envio (se tiver) | Cond. | 60 chars alfanumérico |
| Carriers com tabela própria | ✅ | Movvi, Mengue, Braspress |

**Tabela de frete (formato aceito):**
- CSV ou Excel com colunas: CEP_INICIO, CEP_FIM, PESO_ATÉ, VALOR, PRAZO
- Ou por faixa de zona geográfica: ZONA, PESO_ATÉ, VALOR, PRAZO
- Enviar antes do setup — revisão leva 1–2h

---

## 5. Usuários do sistema

Para cada usuário que vai operar o cockpit:

| Campo | Obrigatório | Exemplo |
|---|---|---|
| Nome completo | ✅ | Ana Souza |
| E-mail | ✅ | ana@construdis.com.br |
| Papel | ✅ | Operador / Gerente / Admin |
| WhatsApp (para suporte) | ❌ | +55 11 99887-6655 |

**Papéis disponíveis:**

| Papel | Acesso |
|---|---|
| **Operador** | Inbox, cotações, pedidos, logística, clientes |
| **Gerente** | Tudo do operador + visão gerencial e relatórios |
| **Admin** | Tudo + configurações do workspace e usuários |

> Mínimo recomendado: 1 Admin + os operadores do dia a dia.

---

## 6. Regras de frete

Informações que influenciam o comportamento do motor de cotação:

| Campo | Obrigatório | Exemplo |
|---|---|---|
| Peso mínimo cobrado (kg) | ✅ | 0.5 kg |
| Peso máximo por despacho (kg) | ✅ | 1.000 kg |
| Dimensões máximas (cm) | ❌ | 200 × 100 × 100 cm |
| Carrier padrão (se tiver preferência) | ❌ | Movvi |
| CEP de origem secundário (filial) | ❌ | — |

---

## 7. Contato técnico do cliente (para o setup)

Pessoa que vai acompanhar o setup técnico e estar disponível para validação:

| Campo | Obrigatório | Exemplo |
|---|---|---|
| Nome | ✅ | Carlos Andrade |
| E-mail | ✅ | carlos@construdis.com.br |
| WhatsApp | ✅ | +55 11 99887-6655 |
| Disponibilidade para validação | ✅ | Terças e quintas das 09h–12h |

---

## 8. Contato operacional (quem vai usar diariamente)

| Campo | Obrigatório | Exemplo |
|---|---|---|
| Nome do operador principal | ✅ | Fernanda Lima |
| E-mail | ✅ | fernanda@construdis.com.br |
| WhatsApp | ✅ | +55 11 98887-7766 |

---

## Formulário de coleta

Enviar ao cliente antes do onboarding. Pode ser via Google Forms, Notion ou e-mail estruturado.

**Template de e-mail:**

```
Assunto: CONDSTORE OS — Dados para configuração

Olá [Nome],

Para iniciar a configuração do seu ambiente CONDSTORE OS, preciso das informações abaixo.
Quanto antes recebermos, mais rápido o setup.

---
1. EMPRESA
Razão Social:
CNPJ:
Segmento:

2. ENDEREÇO DE DESPACHO
CEP:
Logradouro:
Cidade/Estado:

3. WHATSAPP
Número com DDD:
Tem conta Twilio? (Sim/Não)

4. CARRIERS
Usa Melhor Envio? (Sim/Não) — se sim, Token:
Tem tabela de frete de outros carriers? — anexar arquivo

5. USUÁRIOS (repetir para cada pessoa)
Nome | E-mail | Papel (Operador/Gerente/Admin)

6. CONTATO TÉCNICO PARA SETUP
Nome | E-mail | WhatsApp | Disponibilidade

---
Dúvida? Responda este e-mail.
```

---

## Checklist de recebimento

Antes de iniciar o setup, confirmar que todos os dados obrigatórios foram recebidos:

- [ ] Razão Social + CNPJ
- [ ] CEP de origem validado (formato correto, CEP existe)
- [ ] Número WhatsApp confirmado
- [ ] Pelo menos 1 carrier configurável (tabela ou Melhor Envio)
- [ ] Pelo menos 1 usuário Admin definido
- [ ] Contato técnico disponível para validação
