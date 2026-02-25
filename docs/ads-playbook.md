# Ads Playbook (Operacional)

## Regra obrigatória de URL final

Use sempre `/t/{token}` como URL final de campanha.

Template padrão:

```txt
/t/{token}?utm_source=google&utm_medium=cpc&utm_campaign={campanha}&utm_content={adgroup}-{ad}&utm_term={keyword}
```

Não usar landing direta como final URL de anúncio.

## Estrutura mínima de campanhas

- 1 campanha por intenção:
  - `frete`
  - `transportadora`
  - `cotacao`
- 1 ad group por cluster de keyword (sem misturar intenção)
- Naming de `utm_campaign`: `snake_case + data + canal`
  - Ex.: `frete_sp_2026_02_google`

## Negative keywords base (inicial)

Separar branded vs genéricas e aplicar negativas cruzadas quando necessário.

Lista base para excluir:

- `gratis`
- `pdf`
- `curso`
- `trabalho`
- `vaga`
- `emprego`
- `o que é`
- `significado`
- `download`
- `planilha`
- `modelo`
- `tcc`

## Agendamento (2 blocos)

- Horário quente:
  - horário comercial + pico de resposta do time (ex.: `08:00-20:00`)
- Horário frio:
  - madrugada/baixa resposta (ex.: `20:00-08:00`)

Operação:

- Comece com lance/base menor no bloco frio.
- Revise CPA/CR por bloco semanalmente.

## Ajuste por dispositivo

Toda semana:

1. Compare CR (ou `freight_simulations / consumed_tokens`) por dispositivo.
2. Se mobile > desktop com volume suficiente, aumentar ajuste em mobile.
3. Se mobile < desktop, reduzir ajuste em mobile.
4. Não ajustar com amostra pequena (evitar overfitting).

## Checklist executável (2 minutos)

1. Confirmar URL final usando `/t/{token}` em todos os anúncios.
2. Conferir `utm_campaign` seguindo naming convention.
3. Validar negativas base aplicadas.
4. Revisar bloco quente/frio ativo.
5. Revisar ajuste de dispositivo (subir/descer somente com volume).
6. Validar cockpit:
   - `/api/cockpit/metrics/acquisition?groupBy=utm_campaign&window=7d`
   - `/api/cockpit/metrics/acquisition?groupBy=utm_source&window=30d`
