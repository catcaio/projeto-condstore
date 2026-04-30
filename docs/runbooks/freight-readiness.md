# Runbook: Freight Readiness do Primeiro Tenant

## Objetivo
Garantir que o motor de frete está configurado corretamente para o primeiro tenant, validando o roteamento entre Melhor Envio, Tabelas Locais e APIs de transportadoras.

## Pré-requisitos
- Tenant e Admin já provisionados (`npm run tenant:readiness` OK).
- Tabelas de frete locais carregadas (opcional, para fallback).

## Variáveis de Ambiente Necessárias (Nomes)
- `MELHOR_ENVIO_API_URL` (URL de Sandbox ou Produção).
- `MELHOR_ENVIO_TOKEN` (Token gerado no painel do Melhor Envio).
- `MELHOR_ENVIO_TIMEOUT_MS` (Default: 15000).

## Como Validar
Execute o script de prontidão técnica de frete:
```bash
npm run freight:readiness
```

Este script testa:
1. Conexão com DB e existência do tenant.
2. Presença das variáveis de ambiente de frete.
3. Regras de roteamento:
   - Pacotes leves (<= 15kg) -> Melhor Envio.
   - Pacotes pesados para Sul/Sudeste -> Tabela de Frete (Fallback).
   - Pacotes pesados para demais regiões -> Braspress API.

## Checklist Melhor Envio
- [ ] Token de Sandbox configurado para testes.
- [ ] URL apontando para `https://sandbox.melhorenvio.com.br` (se em teste).
- [ ] Token de Produção pronto para virada de chave.

## Checklist Tabela de Frete (Fallback)
- [ ] Transportadoras configuradas na tabela `couriers`.
- [ ] Faixas de CEP e Peso carregadas na tabela `carrier_rate_rows`.
- [ ] Teste de cotação sem API (offline) validado.

## Próximos Passos (Manuais)
O responsável (Rafa) deve:
1. Inserir o Token Real do Melhor Envio na Vercel.
2. Validar se a Braspress API exige credenciais específicas por Tenant (atualmente env-driven global).
3. Monitorar logs de cotação no Dashboard para identificar timeouts de provedores externos.

---
**Critérios de Aceite:**
- `npm run freight:readiness` retorna OK.
- `npm run test:freight` retorna OK.
- Fallback para tabela de frete funciona para CEPs do Sul/Sudeste.
