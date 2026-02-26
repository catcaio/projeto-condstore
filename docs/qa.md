# Cockpit Frontend QA

Para validações visuais em ambientes Windows onde browser automation nativa via CI ou agents seja limitada, utilizamos snapshots automáticos do DOM via requisições diretas de SSR.

## Snapshot Regression Testing

Para validar que o SSR dos data-tables complexos (ex: `/cockpit/acquisition`, `/cockpit/audit`) continua funcionando perfeitamente sem erros de hydrate ou dependências client-only vazando de forma crítica para a carga inicial:

1) Inicie o servidor Next em DEV:
```bash
npm run dev
# ou na porta designada, ex: npm run dev -p 3002
```

2) Em outro terminal, rode o validador:
```bash
npm run qa:snapshots
```

O script automaticamente fará bypass das policies para modo Dev através do token `INTERNAL_TOKEN` e buscará instâncias com strings chaves de validação, provando que o Server Component processou o JSX por completo com Mocks de banco limpo. 
Os snapshots HTML resultantes estarão salvos em `.qa/artifacts/` e podem ser inspecionados no navegador local (Windows) caso ocorram falhas em asserts como `Status 500`.

## Saved Views Server Backend

A persistência default passou de `localStorage` (`client-side`) para a tabela `tenant_saved_views` no backend DB (`server-side`), consumida através de `/api/cockpit/saved-views`. 
Essa API assegura isolamento de Tenants e limites granulares de views gravadas (Máx: 25) limpando chaves dinâmicas extras por schemas de Filter.
Se o DB estiver fora do ar ou não provisionado localmente, a UI faz fall-back graciosamente para local storage (limite local de 10). O suite de QA prova esse pipeline através da injeção de uma **"QA View"** provando que o Server salva e o HTML entrega a listagem.
