# Keys Rotation Runbook (Twilio, Stripe, Internal Tokens, AI Provider)

## A) Escopo e riscos

### O que este runbook rotaciona

- `TWILIO_AUTH_TOKEN`
- `STRIPE_WEBHOOK_SECRET`
- `INTERNAL_JOB_TOKEN` / `INTERNAL_DIAG_TOKEN` (ou token interno equivalente usado em `/api/internal/*`)
- Chaves de AI provider por tenant (via Security & Keys no cockpit quando disponivel)

### O que este runbook NAO rotaciona

- `TWILIO_ACCOUNT_SID`
- `STRIPE_SECRET_KEY` (somente se houver janela de mudanca separada e plano dedicado)
- Senhas de banco, credenciais de infra, segredos fora do escopo de app/webhooks/internal routes

### O que pode quebrar se errar

- Webhook inbound (Twilio/Stripe) passa a retornar 401/403/5xx
- Outbound de mensagens Twilio para de enviar
- Jobs internos `/api/internal/*` passam a retornar 401 por token invalido
- Testes de health/smoke falham e podem mascarar incidentes secundarios

## B) Pre-check (Go/No-Go)

Executar os checks abaixo antes de qualquer rotacao.

### 1. Smoke baseline

```powershell
./tools/smoke/smoke.ps1
if ($LASTEXITCODE -ne 0) { throw "Smoke baseline falhou. No-Go para rotacao." }
```

### 2. Health publico

```powershell
$BASE_URL = "https://SEU-AMBIENTE"
Invoke-WebRequest -Method GET -Uri "$BASE_URL/api/health"
```

Criterio: status `200`.

### 3. Health interno (DB/Redis/Qdrant) com token interno

```powershell
$headers = @{ "x-internal-token" = $env:INTERNAL_TOKEN }
Invoke-WebRequest -Method GET -Headers $headers -Uri "$BASE_URL/api/internal/health/db"
Invoke-WebRequest -Method GET -Headers $headers -Uri "$BASE_URL/api/internal/health/redis"
Invoke-WebRequest -Method GET -Headers $headers -Uri "$BASE_URL/api/internal/health/qdrant"
```

Criterio: status `200`/`204` conforme endpoint.

## C) Rotacao por provedor (passo a passo)

## TWILIO_AUTH_TOKEN

1. Gerar novo token no console Twilio.
2. Atualizar no cockpit Security & Keys (quando disponivel). Fallback: atualizar na Vercel env.
3. Invalidar segredo antigo no Twilio somente apos validacao do novo.
4. Test connection no cockpit (ou endpoint de teste operacional).
5. Validar criterios objetivos:
- inbound webhook Twilio responde sem 5xx
- outbound envia mensagem de teste e recebe ack/sid

Comandos de validacao rapida:

```powershell
$twilioWebhook = "$BASE_URL/api/webhook"
Invoke-WebRequest -Method POST -Uri $twilioWebhook -ContentType "application/x-www-form-urlencoded" -Body "Body=smoke&From=whatsapp%3A%2B000000000&To=whatsapp%3A%2B000000000&SmsSid=SM00000000000000000000000000000000"
```

## STRIPE_WEBHOOK_SECRET

1. Gerar/rotacionar secret no dashboard Stripe (endpoint correto de ambiente).
2. Atualizar no cockpit Security & Keys ou Vercel env.
3. Executar test event no Stripe CLI/dashboard (ambiente correspondente).
4. Validar criterios objetivos:
- webhook Stripe retorna 2xx
- nao ha crescimento anormal de erros de assinatura

## INTERNAL_JOB_TOKEN / INTERNAL_DIAG_TOKEN

1. Gerar novo token forte.
2. Atualizar no cockpit Security & Keys ou Vercel env.
3. Atualizar consumidores internos (jobs/cron/workers) no mesmo change window.
4. Validar criterios objetivos:
- `/api/internal/health/db` sem token retorna 401
- `/api/internal/health/db` com novo token retorna 200/204
- jobs internos nao passam a falhar por unauthorized

## AI provider keys (tenant ai-provider)

1. Gerar nova API key no provedor AI.
2. Atualizar por tenant em Security & Keys.
3. Test connection para o tenant alvo.
4. Validar criterios objetivos:
- chamada de inferencia/teste retorna sucesso
- nao aumenta taxa de erro 401/429/5xx no provider

## D) Validacao pos-rotacao

### 1. Rodar smoke novamente

```powershell
./tools/smoke/smoke.ps1
if ($LASTEXITCODE -ne 0) { throw "Smoke pos-rotacao falhou." }
```

### 2. Teste Twilio ponta a ponta

- Enviar mensagem de teste para numero controlado.
- Confirmar resposta esperada do bot/app.

### 3. Verificar DLQ e circuit breaker

Criterios:

- DLQ nao deve crescer apos a janela de rotacao.
- Circuit breaker nao deve abrir para Twilio/Stripe/AI provider apos rotacao.

Sugestao de check operacional:

```powershell
# Substituir por endpoint/consulta de observabilidade existente no ambiente
Invoke-WebRequest -Method GET -Headers @{ "x-internal-token" = $env:INTERNAL_TOKEN } -Uri "$BASE_URL/api/internal/diag"
```

## E) Rollback

### Como voltar com minimo downtime

1. Reaplicar chave anterior (ainda valida) no cockpit Security & Keys ou Vercel env.
2. Forcar novo deploy/reload de runtime se necessario.
3. Reexecutar smoke + health criticos.
4. Suspender rotacao atual e abrir incidente para RCA.

### Quando executar rollback

- Aumento de 401/403 de webhook imediatamente apos troca
- Outbound Twilio interrompido
- Falha persistente de validacao de assinatura Stripe
- Jobs internos em unauthorized com novo token
- Falha de smoke pos-rotacao sem mitigacao imediata

## F) Auditoria e rastreabilidade

Registrar cada rotacao com evidencias minimas:

- Quem executou
- Ambiente
- Segredo rotacionado (nome, nunca valor)
- Hora de inicio/fim
- Resultado dos pre-checks e pos-checks
- Link para logs/audit trail do cockpit
- Ticket/incidente relacionado

Campos recomendados do ticket:

- `change_type`: key_rotation
- `provider`: twilio | stripe | internal | ai
- `scope`: tenant/global
- `rollback_required`: yes/no
- `post_validation`: pass/fail

## G) Checklist final (copiavel, 5 minutos)

- [ ] Pre-check smoke baseline (`./tools/smoke/smoke.ps1`) aprovado.
- [ ] `/api/health` em `200`.
- [ ] Internal health (`db/redis/qdrant`) ok com token.
- [ ] Nova chave gerada no provedor correto (ambiente correto).
- [ ] Chave atualizada no cockpit Security & Keys ou Vercel env.
- [ ] Test connection aprovado.
- [ ] Validacao funcional (inbound/outbound/jobs/internal route) aprovada.
- [ ] Smoke pos-rotacao aprovado.
- [ ] DLQ e circuit breaker sem degradacao.
- [ ] Ticket/audit log registrado com evidencias.
