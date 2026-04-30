# Runbook: Tracking & Google Ads Readiness

## Objetivo
Garantir que a estrutura de rastreamento (conversões, pageviews e eventos de funil) esteja preparada para quando as campanhas forem ativadas.

## Variáveis (Nomes) - Opcionais para Core
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_GTM_ID`
- `GOOGLE_ADS_CONVERSION_ID`

## Validação Automatizada
```bash
npm run tracking:readiness
```

## Checklist Operacional
- [ ] Tabelas `attribution_clicks` e `public_events` estão íntegras.
- [ ] O sistema não falha caso variáveis de rastreamento estejam ausentes (fallback gracioso).

## MANUAL_RAFA (Próximos Passos Reais)
1. Cadastrar os IDs de medição e tags de conversão do Google na Vercel (se desejar iniciar campanhas imediatamente).
2. Opcionalmente configurar PostHog ou outra ferramenta de Product Analytics, se for parte do escopo futuro.
