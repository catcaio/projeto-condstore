# Runbook: Pilot Launch Readiness

## Objetivo
Garantir a execução centralizada de todas as validações prévias ao lançamento do tenant piloto.

## Validação Automatizada
```bash
npm run pilot:readiness
```

## Checklist Automático
A execução do comando acima validará:
- [ ] Tenant Readiness
- [ ] Freight Readiness
- [ ] WhatsApp Readiness
- [ ] Billing Readiness
- [ ] Tracking Readiness
- [ ] Cockpit Smoke Test

Se todas as etapas retornarem OK, a infraestrutura lógica do MVP está pronta para iniciar piloto real supervisionado. O comando não comprova piloto real executado, resultado comercial, mini-case ou ausência de falhas operacionais em produção.
